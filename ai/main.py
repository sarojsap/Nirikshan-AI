import cv2
import os
import time
from datetime import datetime
from ultralytics import YOLO
from shapely.geometry import Point, Polygon
from dotenv import load_dotenv
from api_client import APIClient

load_dotenv()

CAMERA_ID = os.getenv('CAMERA_ID')

# Initialize API Client
api = APIClient()
model = YOLO('yolov8n.pt')

# Open WebCam (Use 0 for default camera, or replace with an RTSP URL / video path)
cap = cv2.VideoCapture(0)

# 1. Fetch Dynamic Configuration from Node.js Backend
camera_config = api.get_camera_config(CAMERA_ID)

# Fallbacks in case config is missing
CROWD_THRESHOLD = camera_config.get('crowdThreshold') if camera_config else 3
restricted_polygon_data = camera_config.get('restrictedPolygon') if camera_config else None

# Convert JSON polygon [{"x":100, "y":100}, ...] to Shapely format [(100,100), ...]
if restricted_polygon_data:
    polygon_points = [(pt['x'], pt['y']) for pt in restricted_polygon_data]
    RESTRICTED_ZONE = Polygon(polygon_points)
else:
    # Default fallback polygon if the Admin hasn't drawn one yet
    RESTRICTED_ZONE = Polygon([(100, 100), (500, 100), (500, 400), (100, 400)])

# Time restriction strings (e.g., "22:00:00", "06:00:00")
start_time_str = camera_config.get('restrictedStartTime') if camera_config else None
end_time_str = camera_config.get('restrictedEndTime') if camera_config else None

# Helper function to check if current time is inside the restricted window
def is_restricted_time():
    if not start_time_str or not end_time_str:
        return True # If no time set, it's always restricted!
        
    now = datetime.now().time()
    start = datetime.strptime(start_time_str, "%H:%M:%S").time()
    end = datetime.strptime(end_time_str, "%H:%M:%S").time()
    
    # Handle overnight times (e.g., 22:00 to 06:00)
    if start <= end:
        return start <= now <= end
    else: # Crosses midnight
        return start <= now or now <= end

# --- Cooldown Timers (to avoid spamming the DB) ---
# We store the last time an alert was sent. 
cooldowns = {
    "INTRUSION": 0,
    "CROWD": 0
}
COOLDOWN_SECONDS = 10 # Wait 10 seconds before sending the same alert again

def check_cooldown(alert_type):
    current_time = time.time()
    if current_time - cooldowns[alert_type] > COOLDOWN_SECONDS:
        cooldowns[alert_type] = current_time
        return True
    return False

print("Starting video stream... Press 'q' to quit.")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Run YOLOv8 inference on the frame
    # classes=[0] ensures we ONLY detect 'person' (COCO dataset class 0)
    results = model(frame, classes=[0], verbose=False)
    
    person_count = 0
    intrusion_detected = False

    # Parse results
    for r in results:
        boxes = r.boxes
        for box in boxes:
            person_count += 1
            
            # Get bounding box coordinates (x1, y1, x2, y2)
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            # Calculate the bottom-center point of the bounding box (where the person's feet are)
            foot_x = int((x1 + x2) / 2)
            foot_y = y2
            
            # Draw bounding box on frame
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.circle(frame, (foot_x, foot_y), 5, (0, 0, 255), -1) # Draw a red dot on the feet

            # Check if feet are inside the restricted zone
            point = Point(foot_x, foot_y)
            if RESTRICTED_ZONE.contains(point):
                intrusion_detected = True
                cv2.putText(frame, "INTRUDER!", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

    # --- Draw Restricted Zone ---
    pts = [(int(x), int(y)) for x, y in RESTRICTED_ZONE.exterior.coords]
    for i in range(len(pts) - 1):
        cv2.line(frame, pts[i], pts[i+1], (0, 0, 255) if intrusion_detected else (255, 0, 0), 2)

    # --- Analytics & Dashboard UI ---
    cv2.putText(frame, f"People Count: {person_count}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

    # --- Incident Logic & API Triggering ---
    if intrusion_detected and check_cooldown("INTRUSION"):
        api.send_incidents(
            incident_type="INTRUSION",
            description="A person has breached the restricted zone.",
            severity="CRITICAL",
            camera_id=CAMERA_ID
        )

    if intrusion_detected and is_restricted_time():
        if check_cooldown("INTRUSION"):
            api.send_incidents(
                incident_type="INTRUSION",
                description=f"Perimeter breached during restricted hours.",
                severity="CRITICAL",
                camera_id=CAMERA_ID
            )
    
    if person_count >= CROWD_THRESHOLD and check_cooldown("CROWD"):
        api.send_incidents(
            incident_type="CROWD",
            description=f"Crowd threshold exceeded. {person_count} people detected.",
            severity="MEDIUM",
            camera_id=CAMERA_ID
        )

    # Display the frame
    cv2.imshow("Nirikshan AI Surveillance", frame)

    # Press 'q' to quit the window
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()