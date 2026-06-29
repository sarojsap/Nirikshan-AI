import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv('API_URL')
USERNAME = os.getenv('AI_USERNAME')
PASSWORD = os.getenv('AI_PASSWORD')

class APIClient:
    def __init__(self):
        self.token = None
        self.login()

    def login(self):
        try:
            response = requests.post(f"{API_URL}/auth/login", json={
                "email": USERNAME,
                "password": PASSWORD
            })
            response.raise_for_status()
            data = response.json()
            self.token = data.get('data', {}).get('token')
            print('Successfully logged into Node.js Backend')
        
        except Exception as e:
            print(f"Failed to login to API: {e}")

    def send_incident(self, incident_type, description, severity, camera_id):
        if not self.token:
            print("No token available. Cannot send incidents.")
            return
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        payload = {
            "type": incident_type,
            "description": description,
            "severity": severity,
            "cameraId": camera_id,
            "imageUrl": "https://via.placeholder.com/600x400?text=Incident+Snapshot" # Dummy for now
        }

        try:
            res = requests.post(f"{API_URL}/incidents", json=payload, headers=headers)
            res.raise_for_status()
            print(f"Alert Sent: {incident_type} - {description}")
        except Exception as e:
            print(f"Failed to send incidents: {e}")

    def get_camera_config(self, camera_id):
        if not self.token:
            print("No token available.")
            return None
            
        headers = {"Authorization": f"Bearer {self.token}"}
        try:
            res = requests.get(f"{API_URL}/cameras/{camera_id}", headers=headers)
            res.raise_for_status()
            config = res.json()
            print("Successfully fetched dynamic camera configuration.")
            return config
        except Exception as e:
            print(f"Failed to fetch camera config: {e}")
            return None

    def get_or_create_camera_id(self):
        if not self.token:
            print("No token available. Cannot get or create camera.")
            return None

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 1. Fetch existing cameras
        try:
            res = requests.get(f"{API_URL}/cameras", headers=headers)
            res.raise_for_status()
            cameras = res.json()
            if isinstance(cameras, list) and len(cameras) > 0:
                print(f"Found {len(cameras)} registered cameras in backend. Using the first camera.")
                return cameras[0].get('id')
        except Exception as e:
            print(f"Failed to fetch cameras: {e}")

        # 2. No cameras found, register a default camera
        print("No cameras found in backend. Registering default local webcam...")
        payload = {
            "name": "Auto Local Webcam",
            "location": "Office Room",
            "rtspUrl": "0"
        }
        try:
            res = requests.post(f"{API_URL}/cameras", json=payload, headers=headers)
            res.raise_for_status()
            res_data = res.json()
            camera = res_data.get('camera')
            if camera:
                print(f"Registered camera successfully: {camera.get('name')} (ID: {camera.get('id')})")
                return camera.get('id')
        except Exception as e:
            print(f"Failed to auto-register camera: {e}")
            return None