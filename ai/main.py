import cv2
import os
import time
import base64
import logging
from datetime import datetime, timezone, timedelta
from flask import Flask, request, Response, jsonify
from ultralytics import YOLO
from shapely.geometry import Point, Polygon
from dotenv import load_dotenv
from api_client import APIClient

load_dotenv()
CAMERA_ID = os.getenv('CAMERA_ID')
STREAM_PORT = int(os.getenv('STREAM_PORT', 8000))

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger('nirikshan-ai')

app = Flask(__name__)

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
    current_time = time.time()
    key = (camera_id, alert_type)
    last_alert_time = cooldowns.get(key, 0)
    if current_time - last_alert_time > cooldown_seconds:
        cooldowns[key] = current_time
        return True
    return False


def is_within_time_window(start_time_str, end_time_str):
    if not start_time_str or not end_time_str:
        return True
    try:
        now = datetime.now(timezone.utc).time()
        start = datetime.strptime(start_time_str, "%H:%M:%S").time()
        end = datetime.strptime(end_time_str, "%H:%M:%S").time()
        if start <= end:
            return start <= now <= end
        else:
            return start <= now or now <= end
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
                    import json
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


def generate_frames(camera_id=None):
    cid = camera_id if camera_id else CAMERA_ID

    logger.info(f"Starting stream for camera: {cid}")
    cfg = load_camera_config(cid)
    last_config_fetch = time.time()

    video_source = cfg['rtsp_url'] if cfg['rtsp_url'] else 0
    logger.info(f"Opening video source: {video_source}")

    cap = open_video_source(video_source)
    if not cap.isOpened():
        logger.error(f"Failed to open video source: {video_source}")
        return

    logger.info(f"Video source opened successfully for camera: {cid}")

    frame_count = 0
    last_snapshot = None
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.warning("Failed to read frame, attempting reconnection...")
                cap.release()
                time.sleep(2)
                cap = open_video_source(video_source)
                if not cap.isOpened():
                    logger.error("Reconnection failed, ending stream")
                    break
                continue

            frame_count += 1
            if frame_count % 300 == 0:
                logger.info(f"Camera {cid}: processed {frame_count} frames")

            if time.time() - last_config_fetch > 5.0:
                try:
                    cfg = load_camera_config(cid)
                    last_config_fetch = time.time()
                except Exception as e:
                    logger.warning(f"Error reloading config: {e}")

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

            if cfg['alerts_enabled'] and is_within_time_window(cfg['start_time_str'], cfg['end_time_str']):
                if cfg['intrusion_enabled'] and intrusion_detected:
                    if check_cooldown(cid, "INTRUSION", cfg['cooldown_seconds']):
                        if current_snapshot is None:
                            current_snapshot = _encode_frame_as_data_uri(frame)
                            last_snapshot = current_snapshot
                        api.send_incident(
                            "INTRUSION", "Perimeter breached during restricted hours.", "CRITICAL", cid
                        )

                if cfg['crowd_enabled'] and person_count >= cfg['crowd_threshold']:
                    if check_cooldown(cid, "CROWD", cfg['cooldown_seconds']):
                        if current_snapshot is None:
                            current_snapshot = _encode_frame_as_data_uri(frame)
                            last_snapshot = current_snapshot
                        api.send_incident(
                            "CROWD",
                            f"Crowd threshold exceeded. {person_count} people detected.",
                            "MEDIUM",
                            cid,
                        )

            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_bytes = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    except GeneratorExit:
        logger.info(f"Client disconnected from camera {cid}")
    except Exception as e:
        logger.error(f"Stream error for camera {cid}: {e}")
    finally:
        cap.release()
        logger.info(f"Camera {cid} stream ended")


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
    return Response(
        generate_frames(camera_id),
        mimetype='multipart/x-mixed-replace; boundary=frame',
    )


@app.route('/health')
def health():
    return jsonify({
        "status": "ok",
        "camera_id": CAMERA_ID,
        "uptime": time.time(),
    })


if __name__ == '__main__':
    logger.info(f"Starting Nirikshan AI server on port {STREAM_PORT}")
    app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True)
