import cv2
import os
import time
from datetime import datetime
from flask import Flask, Response
from ultralytics import YOLO
from shapely.geometry import Point, Polygon
from dotenv import load_dotenv
from api_client import APIClient

load_dotenv()
CAMERA_ID = os.getenv('CAMERA_ID')
STREAM_PORT = int(os.getenv('STREAM_PORT', 8000))

# Initialize Flask app
app = Flask(__name__)

api = APIClient()
model = YOLO('yolov8n.pt')

# Fetch Dynamic Config
camera_config = api.get_camera_config(CAMERA_ID)
CROWD_THRESHOLD = camera_config.get('crowdThreshold') if camera_config else 3
restricted_polygon_data = camera_config.get('restrictedPolygon') if camera_config else None

if restricted_polygon_data:
    polygon_points = [(pt['x'], pt['y']) for pt in restricted_polygon_data]
    RESTRICTED_ZONE = Polygon(polygon_points)
else:
    RESTRICTED_ZONE = Polygon([(100, 100), (500, 100), (500, 400), (100, 400)])

start_time_str = camera_config.get('restrictedStartTime') if camera_config else None
end_time_str = camera_config.get('restrictedEndTime') if camera_config else None

# Cooldown config
cooldowns = {"INTRUSION": 0, "CROWD": 0}
COOLDOWN_SECONDS = 10

def check_cooldown(alert_type):
    current_time = time.time()
    if current_time - cooldowns[alert_type] > COOLDOWN_SECONDS:
        cooldowns[alert_type] = current_time
        return True
    return False

def is_restricted_time():
    if not start_time_str or not end_time_str:
        return True
    now = datetime.now().time()
    start = datetime.strptime(start_time_str, "%H:%M:%S").time()
    end = datetime.strptime(end_time_str, "%H:%M:%S").time()
    if start <= end:
        return start <= now <= end
    else:
        return start <= now or now <= end

# Generator function that captures frames, processes them, and yields them to the web server
def generate_frames():
    rtsp_url = camera_config.get('rtspUrl') if camera_config else None
    video_source = 0
    if rtsp_url:
        if rtsp_url.isdigit():
            video_source = int(rtsp_url)
        else:
            video_source = rtsp_url
    print(f"[DEBUG] Attempting to open video source: {video_source} (type: {type(video_source).__name__})")
    
    # On Windows, DirectShow (cv2.CAP_DSHOW) is preferred for local webcams
    if isinstance(video_source, int):
        cap = cv2.VideoCapture(video_source, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(video_source)
    
    if not cap.isOpened():
        print(f"[DEBUG] Error: Could not open video source {video_source}")
        return
        
    print(f"[DEBUG] Video source {video_source} opened successfully!")
    
    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("[DEBUG] Error: Failed to read frame from camera")
            break
            
        frame_count += 1
        if frame_count == 1:
            print("[DEBUG] Successfully read first frame from camera!")

        # Run YOLOv8
        results = model(frame, classes=[0], verbose=False)
        person_count = 0
        intrusion_detected = False

        for r in results:
            for box in r.boxes:
                person_count += 1
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                foot_x = int((x1 + x2) / 2)
                foot_y = y2
                
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.circle(frame, (foot_x, foot_y), 5, (0, 0, 255), -1)

                if RESTRICTED_ZONE.contains(Point(foot_x, foot_y)):
                    intrusion_detected = True
                    cv2.putText(frame, "INTRUDER!", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

        # Draw Restricted Zone
        pts = [(int(x), int(y)) for x, y in RESTRICTED_ZONE.exterior.coords]
        for i in range(len(pts) - 1):
            cv2.line(frame, pts[i], pts[i+1], (0, 0, 255) if intrusion_detected else (255, 0, 0), 2)

        # UI Stats
        cv2.putText(frame, f"People Count: {person_count}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

        # Alerts Logic
        if intrusion_detected and is_restricted_time() and check_cooldown("INTRUSION"):
            api.send_incident("INTRUSION", "Perimeter breached during restricted hours.", "CRITICAL", CAMERA_ID)
        
        if person_count >= CROWD_THRESHOLD and check_cooldown("CROWD"):
            api.send_incident("CROWD", f"Crowd threshold exceeded. {person_count} people detected.", "MEDIUM", CAMERA_ID)

        # --- MJPEG ENCODING ---
        # Compress the frame to JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        # Yield the output frame in byte format (multipart/x-mixed-replace)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()

# Flask route for root index page
@app.route('/')
def index():
    return """
    <html>
      <head>
        <title>Nirikshan AI Video Feed</title>
        <style>
          body {
            margin: 0;
            background-color: #0d0d15;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            color: #ffffff;
          }
          .container {
            text-align: center;
          }
          h2 {
            margin-bottom: 20px;
            color: #ffffff;
            text-shadow: 0 0 10px rgba(170, 59, 255, 0.6);
          }
          img {
            border: 4px solid #aa3bff;
            border-radius: 12px;
            box-shadow: 0 0 30px rgba(170, 59, 255, 0.4);
            max-width: 90vw;
            max-height: 80vh;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Nirikshan AI - Live Stream</h2>
          <img src="/video_feed" />
        </div>
      </body>
    </html>
    """

# Flask route for the video feed
@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    # Start the local Flask web server
    app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True)