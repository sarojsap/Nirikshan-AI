const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const STREAM_BASE = import.meta.env.VITE_STREAM_URL || 'http://localhost:8000';

const streamHost = STREAM_BASE.replace(/^https?:\/\//, '');
const wsHost = streamHost.replace(/:8000$/, ':8001');
const WS_BASE = import.meta.env.VITE_WS_URL || `ws://${wsHost}`;

const CLOUD_API_BASE = import.meta.env.VITE_CLOUD_API_URL || 'http://localhost:5001';

export const API = {
  BASE: API_BASE,
  AUTH: `${API_BASE}/api/auth`,
  CAMERAS: `${API_BASE}/api/cameras`,
  OPERATORS: `${API_BASE}/api/operators`,
  INCIDENTS: `${API_BASE}/api/incidents`,
  ANALYTICS: `${API_BASE}/api/analytics`,
  SOCKET: API_BASE,
  SYNC: `${API_BASE}/api/sync`,
};

export const CLOUD_API = {
  BASE: CLOUD_API_BASE,
  AUTH: `${CLOUD_API_BASE}/api/auth`,
  INCIDENTS: `${CLOUD_API_BASE}/api/incidents`,
  DEVICES: `${CLOUD_API_BASE}/api/devices`,
  SUMMARY: `${CLOUD_API_BASE}/api/incidents/summary`,
  SOCKET: CLOUD_API_BASE,
};

export const STREAM = {
  BASE: STREAM_BASE,
  VIDEO_FEED: `${STREAM_BASE}/video_feed`,
  SNAPSHOT: `${STREAM_BASE}/snapshot`,
  WS: WS_BASE,
};

export function detectMode() {
  const stored = localStorage.getItem('nirikshan_mode');
  if (stored === 'cloud' || stored === 'edge') return stored;
  return 'edge';
}

export function setMode(mode) {
  localStorage.setItem('nirikshan_mode', mode);
}
