import cv2
import os
import threading
import time
import base64
import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs
from flask import Flask, request, Response, jsonify
from ultralytics import YOLO
from shapely.geometry import Point, Polygon
from dotenv import load_dotenv
import websockets
from api_client import APIClient

load_dotenv()
CAMERA_ID = os.getenv('CAMERA_ID')
STREAM_PORT = int(os.getenv('STREAM_PORT', 8000))
WEBSOCKET_PORT = int(os.getenv('WEBSOCKET_PORT', 8001))

# Global FPS target — inference runs at this rate regardless of camera source FPS
TARGET_FPS = 24
FRAME_INTERVAL = 1.0 / TARGET_FPS  # ~0.0417s per frame

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger('nirikshan-ai')

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = '*'
    response.headers['Access-Control-Allow-Methods'] = '*'
    return response

api = APIClient()
model = YOLO('yolov8n.pt')

camera_exists = False
if CAMERA_ID and CAMERA_ID != 'your-camera-uuid-here' and CAMERA_ID.strip() != '':
    config = api.get_camera_config(CAMERA_ID)
    if config:
        camera_exists = True

if not camera_exists:
    logger.info("CAMERA_ID missing or does not exist. Attempting auto-registration...")
    CAMERA_ID = api.get_or_create_camera_id()
    if CAMERA_ID:
        env_path = os.path.join(os.path.dirname(__file__), '.env')
        try:
            lines = []
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    lines = f.readlines()
            updated = False
            for i, line in enumerate(lines):
                if line.strip().startswith('CAMERA_ID='):
                    lines[i] = f"CAMERA_ID={CAMERA_ID}\n"
                    updated = True
                    break
            if not updated:
                lines.append(f"CAMERA_ID={CAMERA_ID}\n")
            with open(env_path, 'w') as f:
                f.writelines(lines)
            logger.info(f"Saved CAMERA_ID={CAMERA_ID} to .env")
        except Exception as e:
            logger.error(f"Failed to write CAMERA_ID to .env: {e}")
    else:
        logger.warning("Could not retrieve or create a Camera ID from backend!")

cooldowns = {}
COOLDOWN_CLEANUP_INTERVAL = 3600
_last_cooldown_cleanup = time.time()

# Thread-safe frame cache: stores the latest JPEG bytes for each camera_id
# so the /snapshot endpoint can return cached frames without opening a new VideoCapture
_frame_cache = {}
_last_frame_time = {}
_frame_cache_lock = threading.Lock()

INCIDENT_SNAPSHOT_DIR = os.path.join(os.path.dirname(__file__), 'snapshots')
os.makedirs(INCIDENT_SNAPSHOT_DIR, exist_ok=True)


def _cleanup_stale_cooldowns():
    global _last_cooldown_cleanup
    now = time.time()
    if now - _last_cooldown_cleanup < COOLDOWN_CLEANUP_INTERVAL:
        return
    stale_before = now - 3600
    to_delete = [k for k, v in cooldowns.items() if v < stale_before]
    for k in to_delete:
        del cooldowns[k]
    if to_delete:
        logger.debug(f"Cleaned up {len(to_delete)} stale cooldown entries")
    _last_cooldown_cleanup = now


def check_cooldown(camera_id, alert_type, cooldown_seconds):
    _cleanup_stale_cooldowns()
    now = time.time()
    key = f"{camera_id}:{alert_type}"
    last_alert_time = cooldowns.get(key, 0)
    if now - last_alert_time > cooldown_seconds:
        cooldowns[key] = now
        return True
    logger.info(f"Alert {alert_type} on camera {camera_id} throttled by cooldown (elapsed: {now - last_alert_time:.1f}s, limit: {cooldown_seconds}s)")
    return False


def is_within_time_window(start_time_str, end_time_str):
    if not start_time_str or not end_time_str:
        return True
    try:
        now = datetime.now().time()
        start = datetime.strptime(start_time_str, "%H:%M:%S").time()
        end = datetime.strptime(end_time_str, "%H:%M:%S").time()
        if start <= end:
            res = start <= now <= end
        else:
            res = start <= now or now <= end
        logger.info(f"Time window check: start={start}, end={end}, now={now} -> within={res}")
        return res
    except Exception as e:
        logger.warning(f"Error parsing time window '{start_time_str}-{end_time_str}': {e}")
        return True


def _encode_frame_as_data_uri(frame):
    ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
    if not ret:
        return None
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')


def load_camera_config(cid):
    config = api.get_camera_config(cid)

    crowd_threshold = 3
    confidence_threshold = 0.5
    cooldown_seconds = 10
    alerts_enabled = True
    intrusion_enabled = True
    crowd_enabled = True
    restricted_zone = None
    start_time_str = None
    end_time_str = None
    rtsp_url = None

    if config:
        crowd_threshold = config.get('crowdThreshold', crowd_threshold)
        confidence_threshold = config.get('confidenceThreshold', confidence_threshold)
        cooldown_seconds = config.get('cooldownSeconds', cooldown_seconds)
        alerts_enabled = config.get('alertsEnabled', alerts_enabled)
        intrusion_enabled = config.get('intrusionEnabled', intrusion_enabled)
        crowd_enabled = config.get('crowdEnabled', crowd_enabled)
        start_time_str = config.get('restrictedStartTime')
        end_time_str = config.get('restrictedEndTime')
        rtsp_url = config.get('rtspUrl')

        restricted_polygon_data = config.get('restrictedPolygon')
        if restricted_polygon_data:
            try:
                if isinstance(restricted_polygon_data, str):
                    restricted_polygon_data = json.loads(restricted_polygon_data)
                if isinstance(restricted_polygon_data, list) and len(restricted_polygon_data) >= 3:
                    polygon_points = [(pt['x'], pt['y']) for pt in restricted_polygon_data]
                    restricted_zone = Polygon(polygon_points)
            except Exception as e:
                logger.warning(f"Error building polygon: {e}")

    return {
        'crowd_threshold': crowd_threshold,
        'confidence_threshold': confidence_threshold,
        'cooldown_seconds': cooldown_seconds,
        'alerts_enabled': alerts_enabled,
        'intrusion_enabled': intrusion_enabled,
        'crowd_enabled': crowd_enabled,
        'restricted_zone': restricted_zone,
        'start_time_str': start_time_str,
        'end_time_str': end_time_str,
        'rtsp_url': rtsp_url,
    }


def open_video_source(source):
    if isinstance(source, int) or (isinstance(source, str) and source.isdigit()):
        cam_index = int(source) if isinstance(source, str) else source
        cap = cv2.VideoCapture(cam_index)
    else:
        cap = cv2.VideoCapture(source)
    return cap


_camera_threads = {}
_threads_lock = threading.Lock()
_last_access = {}
_access_lock = threading.Lock()


def mark_camera_accessed(camera_id):
    with _access_lock:
        _last_access[camera_id] = time.time()


def ensure_camera_thread(camera_id):
    with _threads_lock:
        thread = _camera_threads.get(camera_id)
        if not thread or not thread.is_alive():
            thread = CameraThread(camera_id)
            _camera_threads[camera_id] = thread
            thread.start()
            logger.info(f"Started background thread for camera: {camera_id}")


class CameraThread(threading.Thread):
    def __init__(self, camera_id):
        super().__init__()
        self.camera_id = camera_id
        self.daemon = True
        self.running = True

    def run(self):
        logger.info(f"Background thread started for camera: {self.camera_id}")
        last_snapshot = None
        cap = None

        # Fixed-interval frame scheduling for consistent 24 FPS
        next_frame_time = time.time()

        while self.running:
            try:
                # 1. Fetch camera configuration
                cfg = load_camera_config(self.camera_id)
                video_source = cfg['rtsp_url'] if cfg['rtsp_url'] else 0
                logger.info(f"Camera {self.camera_id} Thread: Opening video source {video_source}")

                cap = open_video_source(video_source)
                if not cap.isOpened():
                    logger.error(f"Camera {self.camera_id} Thread: Failed to open source {video_source}")
                    time.sleep(5)
                    continue

                logger.info(f"Camera {self.camera_id} Thread: Video source opened successfully")
                frame_count = 0
                last_config_fetch = time.time()

                while self.running:
                    # Check inactivity timeout (30 seconds of no requests)
                    with _access_lock:
                        last_req_time = _last_access.get(self.camera_id, 0)
                    if time.time() - last_req_time > 30.0:
                        logger.info(f"Camera {self.camera_id} Thread: Stopping due to inactivity (>30 seconds)")
                        self.running = False
                        break

                    ret, frame = cap.read()
                    if not ret:
                        logger.warning(f"Camera {self.camera_id} Thread: Failed to read frame, reconnecting...")
                        cap.release()
                        cap = None
                        time.sleep(2)
                        break

                    now = time.time()

                    # ── Frame skipping: only process at TARGET_FPS ──
                    # If we're ahead of schedule, skip inference for this frame
                    # to maintain exactly TARGET_FPS (24) and reduce CPU load.
                    if now < next_frame_time:
                        continue

                    next_frame_time = now + FRAME_INTERVAL
                    # Catch-up protection: if we fell behind by more than one interval,
                    # don't accumulate debt — just continue from current time
                    if next_frame_time < now:
                        next_frame_time = now + FRAME_INTERVAL
                    # ──────────────────────────────────────────────────

                    frame_count += 1
                    if frame_count % 300 == 0:
                        logger.info(f"Camera {self.camera_id} Thread: Processed {frame_count} frames at {TARGET_FPS} FPS")

                    # Periodically refresh config from database
                    if now - last_config_fetch > 5.0:
                        try:
                            cfg = load_camera_config(self.camera_id)
                            last_config_fetch = now
                        except Exception as e:
                            logger.warning(f"Camera {self.camera_id} Thread: Error reloading config: {e}")

                    # Run YOLO detection
                    results = model(frame, conf=cfg['confidence_threshold'], classes=[0], verbose=False)
                    person_count = 0
                    intrusion_detected = False
                    current_snapshot = None

                    for r in results:
                        for box in r.boxes:
                            person_count += 1
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            foot_x = int((x1 + x2) / 2)
                            foot_y = y2

                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                            cv2.circle(frame, (foot_x, foot_y), 5, (0, 0, 255), -1)

                            if cfg['restricted_zone'] and cfg['restricted_zone'].contains(Point(foot_x, foot_y)):
                                intrusion_detected = True
                                cv2.putText(frame, "INTRUDER!", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

                    if cfg['restricted_zone']:
                        try:
                            pts = [(int(x), int(y)) for x, y in cfg['restricted_zone'].exterior.coords]
                            for i in range(len(pts) - 1):
                                cv2.line(frame, pts[i], pts[i + 1], (0, 0, 255) if intrusion_detected else (255, 0, 0), 2)
                        except Exception:
                            pass

                    cv2.putText(frame, f"People Count: {person_count}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

                    # Trigger alert notifications
                    if cfg['alerts_enabled'] and is_within_time_window(cfg['start_time_str'], cfg['end_time_str']):
                        if cfg['intrusion_enabled'] and intrusion_detected:
                            if check_cooldown(self.camera_id, "INTRUSION", cfg['cooldown_seconds']):
                                if current_snapshot is None:
                                    current_snapshot = _encode_frame_as_data_uri(frame)
                                    last_snapshot = current_snapshot
                                api.send_incident(
                                    "INTRUSION",
                                    "Perimeter breached during restricted hours.",
                                    "CRITICAL",
                                    self.camera_id,
                                    image_url=current_snapshot
                                )

                        if cfg['crowd_enabled'] and person_count >= cfg['crowd_threshold']:
                            if check_cooldown(self.camera_id, "CROWD", cfg['cooldown_seconds']):
                                if current_snapshot is None:
                                    current_snapshot = _encode_frame_as_data_uri(frame)
                                    last_snapshot = current_snapshot
                                api.send_incident(
                                    "CROWD",
                                    f"Crowd threshold exceeded. {person_count} people detected.",
                                    "MEDIUM",
                                    self.camera_id,
                                    image_url=current_snapshot
                                )

                    # Encode and cache the frame
                    ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    if ret:
                        frame_bytes = buffer.tobytes()
                        with _frame_cache_lock:
                            _frame_cache[self.camera_id] = frame_bytes
                            _last_frame_time[self.camera_id] = now

            except Exception as e:
                logger.error(f"Camera {self.camera_id} Thread: Uncaught error: {e}")
                time.sleep(5)
            finally:
                if cap:
                    cap.release()
                    cap = None
        logger.info(f"Background thread ended for camera: {self.camera_id}")


# ── WebSocket Video Streaming Server ──────────────────────────────
# Runs on a separate port from Flask, streams cached frames as binary
# JPEG messages to connected browser clients.

async def ws_video_feed(websocket):
    try:
        # In websockets v16, the path + query is on request.path
        request_path = websocket.request.path
        query = parse_qs(urlparse(request_path).query)
        camera_id = query.get('camera_id', [None])[0]
        if not camera_id:
            camera_id = CAMERA_ID
        if not camera_id:
            await websocket.close(1008, "camera_id required")
            return

        mark_camera_accessed(camera_id)
        ensure_camera_thread(camera_id)

        # Wait up to 8 seconds for the first frame to appear in the cache.
        # The camera thread starts asynchronously, so the cache is initially empty.
        first_frame_ok = False
        for _ in range(80):
            with _frame_cache_lock:
                if _frame_cache.get(camera_id) is not None:
                    first_frame_ok = True
                    break
            await asyncio.sleep(0.1)

        if not first_frame_ok:
            logger.warning(f"WS: No frames for {camera_id}, closing")
            await websocket.close(1011, "Camera feed unavailable")
            return

        last_send_time = 0
        stale_cycles = 0

        while True:
            mark_camera_accessed(camera_id)

            with _frame_cache_lock:
                cached = _frame_cache.get(camera_id)
                last_time = _last_frame_time.get(camera_id, 0)

            fresh = time.time() - last_time <= 8.0
            if not fresh:
                stale_cycles += 1
                if stale_cycles > 20:
                    logger.warning(f"WS: Closing stream for {camera_id} due to feed loss")
                    break
                await asyncio.sleep(FRAME_INTERVAL)
                continue

            stale_cycles = 0

            # Only send if we have a new frame (compare timestamps, not bytes)
            if cached is not None and last_time != last_send_time:
                try:
                    await websocket.send(cached)
                    last_send_time = last_time
                except websockets.ConnectionClosed:
                    break

            await asyncio.sleep(FRAME_INTERVAL)

    except asyncio.CancelledError:
        pass
    except websockets.ConnectionClosed:
        pass
    except Exception as e:
        logger.error(f"WS stream error: {e}", exc_info=True)


async def ws_handler(websocket):
    await ws_video_feed(websocket)


def start_websocket_server():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def serve():
        async with websockets.serve(
            ws_handler,
            "0.0.0.0",
            WEBSOCKET_PORT,
            ping_interval=20,
            ping_timeout=10,
            origins=None,
        ):
            logger.info(f"WebSocket streaming server listening on ws://0.0.0.0:{WEBSOCKET_PORT}")
            await asyncio.Future()

    try:
        loop.run_until_complete(serve())
    except Exception as e:
        logger.error(f"WebSocket server failed: {e}")


# Start WebSocket server in a daemon thread
ws_thread = threading.Thread(target=start_websocket_server, daemon=True, name="ws-server")
ws_thread.start()


@app.route('/')
def index():
    return """
    <html>
      <head>
        <title>Nirikshan AI Video Feed</title>
        <style>
          body { margin: 0; background-color: #0d0d15; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; color: #ffffff; }
          .container { text-align: center; }
          h2 { margin-bottom: 20px; color: #ffffff; text-shadow: 0 0 10px rgba(170, 59, 255, 0.6); }
          img { border: 4px solid #aa3bff; border-radius: 12px; box-shadow: 0 0 30px rgba(170, 59, 255, 0.4); max-width: 90vw; max-height: 80vh; }
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


@app.route('/video_feed')
def video_feed():
    camera_id = request.args.get('camera_id')
    cid = camera_id if camera_id else CAMERA_ID

    mark_camera_accessed(cid)
    ensure_camera_thread(cid)

    # Wait up to 3 seconds for the first frame to populate
    first_frame_ok = False
    for _ in range(30):
        with _frame_cache_lock:
            last_time = _last_frame_time.get(cid, 0)
            if time.time() - last_time < 5.0:
                first_frame_ok = True
                break
        time.sleep(0.1)

    if not first_frame_ok:
        logger.warning(f"Video feed requested for offline/unreachable camera: {cid}")
        return Response("Camera offline", status=503)

    def stream_cached_frames():
        last_frame = None
        consecutive_missing = 0
        try:
            while True:
                mark_camera_accessed(cid)
                
                # Check if camera has timed out (no new frame for > 8 seconds)
                with _frame_cache_lock:
                    last_time = _last_frame_time.get(cid, 0)
                    cached = _frame_cache.get(cid)
                
                if time.time() - last_time > 8.0:
                    logger.warning(f"Closing stream connection for camera {cid} due to feed loss")
                    break

                if cached:
                    if cached != last_frame:
                        last_frame = cached
                        yield (b'--frame\r\n'
                               b'Content-Type: image/jpeg\r\n\r\n' + cached + b'\r\n')
                        consecutive_missing = 0
                else:
                    consecutive_missing += 1
                    if consecutive_missing > 100:  # ~5 seconds of no cached frame
                        break
                time.sleep(0.05)
        except GeneratorExit:
            pass

    return Response(
        stream_cached_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame',
    )


@app.route('/snapshot')
def snapshot():
    camera_id = request.args.get('camera_id')
    cid = camera_id if camera_id else CAMERA_ID

    mark_camera_accessed(cid)
    ensure_camera_thread(cid)

    # Wait up to 1 second for cache to be populated initially
    for _ in range(10):
        with _frame_cache_lock:
            last_time = _last_frame_time.get(cid, 0)
            cached = _frame_cache.get(cid)
            is_valid = time.time() - last_time < 8.0
        if cached and is_valid:
            return Response(cached, mimetype='image/jpeg',
                            headers={'Cache-Control': 'no-cache, no-store, must-revalidate'})
        time.sleep(0.1)

    return Response(status=503)


@app.route('/health')
def health():
    return jsonify({
        "status": "ok",
        "camera_id": CAMERA_ID,
        "uptime": time.time(),
        "active_threads": [cid for cid, t in _camera_threads.items() if t.is_alive()]
    })


if __name__ == '__main__':
    logger.info(f"Starting Nirikshan AI server on port {STREAM_PORT}")
    app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True)
