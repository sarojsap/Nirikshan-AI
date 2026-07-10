import subprocess
import os
import sys
import time
import socket
import urllib.request
import zipfile

def get_local_ip():
    """Retrieve the primary local IP address of this machine."""
    try:
        # Connect to an external address (doesn't actually send packets) to identify the correct interface
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # Fallback to local hostname resolution if network is offline
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

def download_mediamtx(script_dir):
    """Ensure MediaMTX (RTSP server) is available in the script directory."""
    mediamtx_exe = os.path.join(script_dir, 'mediamtx.exe')
    if os.path.exists(mediamtx_exe):
        return mediamtx_exe

    print("MediaMTX (RTSP server) not found. Downloading...")
    url = "https://github.com/bluenviron/mediamtx/releases/download/v1.9.0/mediamtx_v1.9.0_windows_amd64.zip"
    zip_path = os.path.join(script_dir, "mediamtx.zip")
    
    try:
        # Set a User-Agent to avoid generic downloader blocks
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response, open(zip_path, 'wb') as out_file:
            out_file.write(response.read())
            
        print("Download complete. Extracting...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(script_dir)
        
        # Clean up zip
        os.remove(zip_path)
        print("MediaMTX extracted successfully.")
        return mediamtx_exe
    except Exception as e:
        print(f"Error downloading/extracting MediaMTX: {e}")
        # Clean up zip if it was partially downloaded
        if os.path.exists(zip_path):
            os.remove(zip_path)
        return None

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Download and set up MediaMTX RTSP Server if missing
    mediamtx_exe = download_mediamtx(script_dir)
    if not mediamtx_exe:
        print("Fatal: Failed to set up MediaMTX. Cannot start streams.")
        sys.exit(1)

    # 2. Resolve video paths
    videos_dir = os.path.join(script_dir, 'videos')
    office_video = os.path.join(videos_dir, 'office.mp4')
    school_video = os.path.join(videos_dir, 'school.mp4')
    
    # Verify both files exist
    if not os.path.exists(office_video):
        print(f"Error: Office video file not found at: {office_video}")
        sys.exit(1)
    if not os.path.exists(school_video):
        print(f"Error: School video file not found at: {school_video}")
        sys.exit(1)
        
    # Get active local IP address
    local_ip = get_local_ip()
        
    # Define RTSP destinations (stream localhost internally, consumer link uses LAN IP)
    office_rtsp_local = "rtsp://127.0.0.1:8554/office"
    school_rtsp_local = "rtsp://127.0.0.1:8554/school"
    
    office_rtsp_lan = f"rtsp://{local_ip}:8554/office"
    school_rtsp_lan = f"rtsp://{local_ip}:8554/school"
    
    # FFmpeg commands to loop streams infinitely (-stream_loop -1)
    ffmpeg_office = [
        "ffmpeg", "-re", "-stream_loop", "-1", "-i", office_video,
        "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac",
        "-f", "rtsp", "-rtsp_transport", "tcp", office_rtsp_local
    ]
    
    ffmpeg_school = [
        "ffmpeg", "-re", "-stream_loop", "-1", "-i", school_video,
        "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac",
        "-f", "rtsp", "-rtsp_transport", "tcp", school_rtsp_local
    ]
    
    print("=" * 60)
    print("            NIRIKSHAN AI RTSP STREAM AUTOMATION")
    print("=" * 60)
    print(f"Office Stream: {office_rtsp_lan}")
    print(f"School Stream: {school_rtsp_lan}")
    print("-" * 60)
    print("Starting MediaMTX RTSP Server...")
    
    processes = []
    try:
        # Start MediaMTX Server
        p_server = subprocess.Popen([mediamtx_exe], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        processes.append(p_server)
        
        # Wait a moment for server initialization
        time.sleep(2)
        
        print("Publishing video streams to server...")
        # Start FFmpeg publishers
        p_office = subprocess.Popen(ffmpeg_office, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        processes.append(p_office)
        
        p_school = subprocess.Popen(ffmpeg_school, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        processes.append(p_school)
        
        print("Streams active. Press Ctrl+C to stop.")
        
        # Keep monitoring loop
        while True:
            # Auto-restart if server drops
            if p_server.poll() is not None:
                print("Warning: MediaMTX server stopped. Restarting...")
                p_server = subprocess.Popen([mediamtx_exe], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                processes[0] = p_server
                time.sleep(1)
                
            # Auto-restart if any publisher drops
            if p_office.poll() is not None:
                print("Warning: Office stream stopped. Restarting process...")
                p_office = subprocess.Popen(ffmpeg_office, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                processes[1] = p_office
                
            if p_school.poll() is not None:
                print("Warning: School stream stopped. Restarting process...")
                p_school = subprocess.Popen(ffmpeg_school, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                processes[2] = p_school
                
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\nStopping active RTSP streams and server...")
    finally:
        # Graceful cleanup of processes
        for p in processes:
            try:
                p.terminate()
                p.wait(timeout=2)
            except Exception:
                p.kill()
        print("All streaming processes successfully terminated.")

if __name__ == '__main__':
    main()
