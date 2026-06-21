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