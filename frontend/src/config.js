const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const STREAM_BASE = import.meta.env.VITE_STREAM_URL || 'http://localhost:8000';

export const API = {
  BASE: API_BASE,
  AUTH: `${API_BASE}/api/auth`,
  CAMERAS: `${API_BASE}/api/cameras`,
  OPERATORS: `${API_BASE}/api/operators`,
  INCIDENTS: `${API_BASE}/api/incidents`,
  ANALYTICS: `${API_BASE}/api/analytics`,
  SOCKET: API_BASE,
};

export const STREAM = {
  BASE: STREAM_BASE,
  VIDEO_FEED: `${STREAM_BASE}/video_feed`,
  SNAPSHOT: `${STREAM_BASE}/snapshot`,
};
