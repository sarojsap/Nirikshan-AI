import os
import json
import time
import logging
import threading
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv('API_URL')
USERNAME = os.getenv('AI_USERNAME')
PASSWORD = os.getenv('AI_PASSWORD')

logger = logging.getLogger(__name__)

QUEUE_FILE = os.path.join(os.path.dirname(__file__), 'failed_incidents.json')


def find_free_port(start=9000, end=9999):
    import socket
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
    return start


class APIClient:
    def __init__(self):
        self.token = None
        self._session = requests.Session()
        self._last_login_attempt = 0
        self._login_retry_delay = 5
        self._lock = threading.RLock()
        self.login()

    def _ensure_authenticated(self):
        with self._lock:
            if not self.token:
                return self.login()
            return True

    def login(self):
        with self._lock:
            now = time.time()
            if now - self._last_login_attempt < self._login_retry_delay:
                return False
            self._last_login_attempt = now
            try:
                resp = self._session.post(
                    f"{API_URL}/auth/login",
                    json={"email": USERNAME, "password": PASSWORD},
                    timeout=10,
                )
                resp.raise_for_status()
                data = resp.json()
                self.token = data.get('data', {}).get('token')
                self._session.headers.update({"Authorization": f"Bearer {self.token}"})
                logger.info('Successfully logged into Edge Backend')
                self._login_retry_delay = 5
                self._retry_failed()
                return True
            except Exception as e:
                logger.error(f"Failed to login to API: {e}")
                self.token = None
                self._login_retry_delay = min(self._login_retry_delay * 2, 300)
                return False

    def _request(self, method, path, **kwargs):
        with self._lock:
            kwargs.setdefault('timeout', 10)
            if self.token:
                self._session.headers.update({"Authorization": f"Bearer {self.token}"})
            for attempt in range(3):
                try:
                    resp = self._session.request(method, f"{API_URL}{path}", **kwargs)
                    if resp.status_code == 401 and attempt < 2:
                        if self.login():
                            continue
                        return None
                    resp.raise_for_status()
                    return resp.json()
                except requests.RequestException as e:
                    logger.warning(f"Request failed (attempt {attempt + 1}/3): {e}")
                    if attempt < 2:
                        time.sleep(1 * (2 ** attempt))
                    else:
                        logger.error(f"Request failed after 3 attempts: {e}")
                        return None

    def _queue_failed(self, payload):
        failed = []
        if os.path.exists(QUEUE_FILE):
            try:
                with open(QUEUE_FILE, 'r') as f:
                    failed = json.load(f)
            except Exception:
                failed = []
        failed.append(payload)
        failed = failed[-1000:]
        with open(QUEUE_FILE, 'w') as f:
            json.dump(failed, f)
        logger.warning(f"Incident queued to disk ({len(failed)} pending)")

    def _retry_failed(self):
        if not os.path.exists(QUEUE_FILE):
            return
        try:
            with open(QUEUE_FILE, 'r') as f:
                failed = json.load(f)
        except Exception:
            return
        if not failed:
            os.remove(QUEUE_FILE)
            return
        successful = []
        for incident in failed:
            result = self._request("POST", "/incidents", json=incident)
            if result:
                successful.append(incident)
        remaining = [i for i in failed if i not in successful]
        if remaining:
            with open(QUEUE_FILE, 'w') as f:
                json.dump(remaining, f)
            logger.info(f"Retried {len(failed)} incidents, {len(remaining)} still pending")
        else:
            os.remove(QUEUE_FILE)
            logger.info(f"All {len(failed)} queued incidents sent successfully")

    def send_incident(self, incident_type, description, severity, camera_id,
                      image_url=None, clip_url=None,
                      local_snapshot_path=None, local_clip_path=None):
        self._retry_failed()

        if not self._ensure_authenticated():
            logger.error("Cannot send incident: not authenticated")
            return

        payload = {
            "type": incident_type,
            "description": description,
            "severity": severity,
            "cameraId": camera_id,
        }
        if image_url:
            payload["imageUrl"] = image_url
        if clip_url:
            payload["clipUrl"] = clip_url
        if local_snapshot_path:
            payload["localSnapshotPath"] = local_snapshot_path
        if local_clip_path:
            payload["localClipPath"] = local_clip_path

        result = self._request("POST", "/incidents", json=payload)
        if result:
            logger.info(f"Alert Sent: {incident_type} - {description} (sync: {result.get('syncStatus', 'unknown')})")
        else:
            logger.error(f"Failed to send incident: {incident_type}")
            self._queue_failed(payload)

    def get_camera_config(self, camera_id):
        if not self._ensure_authenticated():
            return None

        result = self._request("GET", f"/cameras/{camera_id}")
        if result:
            logger.debug("Successfully fetched dynamic camera configuration.")
            return result
        return None

    def get_or_create_camera_id(self):
        if not self._ensure_authenticated():
            return None

        cameras = self._request("GET", "/cameras")
        if isinstance(cameras, list) and len(cameras) > 0:
            found = cameras[0].get('id')
            logger.info(f"Found {len(cameras)} registered cameras. Using camera ID: {found}")
            return found

        logger.info("No cameras found. Registering default local webcam...")
        payload = {
            "name": "Auto Local Webcam",
            "location": "Office Room",
            "rtspUrl": "0",
        }
        result = self._request("POST", "/cameras", json=payload)
        if result:
            camera = result.get('camera')
            if camera:
                cid = camera.get('id')
                logger.info(f"Registered camera: {camera.get('name')} (ID: {cid})")
                return cid
        logger.error("Failed to auto-register camera")
        return None
