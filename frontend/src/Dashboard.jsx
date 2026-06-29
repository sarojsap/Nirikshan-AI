import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './Dashboard.css';

export default function Dashboard({ token, user, onLogout }) {
  // Database States
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [incidents, setIncidents] = useState([]);
  
  // Analytics / Counters
  const [stats, setStats] = useState({
    totalCameras: 0,
    activeCameras: 0,
    totalIncidents: 0,
  });

  // UI States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Add Camera Form States
  const [camName, setCamName] = useState('');
  const [camLocation, setCamLocation] = useState('');
  const [camSourceType, setCamSourceType] = useState('webcam'); // 'webcam' or 'rtsp'
  const [camRtspUrl, setCamRtspUrl] = useState('0');

  const socketRef = useRef(null);

  // Synthesize a premium notification beep using Web Audio API (no external file needed)
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      // Dual tone to sound like a clean high-end alert
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime); // E5
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio feedback blocked by browser autoplay policy');
    }
  };

  // Fetch initial cameras and analytics summary
  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      // 1. Fetch Cameras
      const camRes = await fetch('http://localhost:5000/api/cameras', { headers });
      if (camRes.status === 401) {
        onLogout();
        return;
      }
      if (camRes.ok) {
        const camData = await camRes.json();
        setCameras(camData);
        if (camData.length > 0 && !selectedCamera) {
          setSelectedCamera(camData[0]); // Default to first camera
        }
      }

      // 2. Fetch Analytics
      const statsRes = await fetch('http://localhost:5000/api/analytics/summary', { headers });
      if (statsRes.status === 401) {
        onLogout();
        return;
      }
      if (statsRes.ok) {
        const summary = await statsRes.json();
        setStats({
          totalCameras: summary.cameras.total,
          activeCameras: summary.cameras.active,
          totalIncidents: summary.incidents.total,
        });
        setIncidents(summary.recentIncidents || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Establish WebSocket Connection for real-time incidents
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('connect', () => {
      console.log('Connected to incident stream server.');
    });

    socketRef.current.on('new_incident', (incident) => {
      console.log('Real-time incident received:', incident);
      playAlertSound();

      // Insert new incident at the top of the feed
      setIncidents((prev) => [incident, ...prev.slice(0, 19)]);
      
      // Update counters
      setStats((prev) => ({
        ...prev,
        totalIncidents: prev.totalIncidents + 1,
      }));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  // Handle source toggle click in modal
  const handleSourceTypeChange = (type) => {
    setCamSourceType(type);
    if (type === 'webcam') {
      setCamRtspUrl('0'); // Default webcam index
    } else {
      setCamRtspUrl('rtsp://192.168.1.100:554/stream'); // Template rtsp
    }
  };

  // Add camera submit
  const handleAddCamera = async (e) => {
    e.preventDefault();
    setModalError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/cameras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: camName,
          location: camLocation,
          rtspUrl: camRtspUrl,
        }),
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add camera.');
      }

      // Reset form & close modal
      setCamName('');
      setCamLocation('');
      setCamSourceType('webcam');
      setCamRtspUrl('0');
      setIsAddModalOpen(false);

      // Refresh camera registry & stats
      fetchData();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Camera API call
  const handleDeleteCamera = async (e, camId, camName) => {
    e.stopPropagation();

    const confirmDelete = window.confirm(`Are you sure you want to delete camera "${camName}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`http://localhost:5000/api/cameras/${camId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete camera.');
      }

      // If selected camera is the one deleted, reset it
      if (selectedCamera?.id === camId) {
        setSelectedCamera(null);
      }

      // Refresh camera list & stats counters
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="dashboard-root">
      {/* Header Bar */}
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
            </svg>
          </div>
          <span className="brand-title">Nirikshan AI</span>
        </div>

        <div className="user-controls">
          <div className="profile-card">
            <span className="profile-name">{user?.name || 'Administrator'}</span>
            <span className="profile-badge">{user?.role}</span>
          </div>
          <button className="btn-signout" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Analytics Strip */}
      <section className="stats-ribbon">
        <div className="stat-card">
          <div className="stat-icon cameras">📹</div>
          <div className="stat-details">
            <span className="stat-val">{stats.totalCameras}</span>
            <span className="stat-lbl">Total Cameras</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">🟢</div>
          <div className="stat-details">
            <span className="stat-val">{stats.activeCameras}</span>
            <span className="stat-lbl">Active Streams</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon incidents">🚨</div>
          <div className="stat-details">
            <span className="stat-val">{stats.totalIncidents}</span>
            <span className="stat-lbl">Security Alerts</span>
          </div>
        </div>
      </section>

      {/* Main Grid Workspace */}
      <main className="dashboard-grid">
        {/* Left sidebar: Cameras */}
        <section className="sidebar-panel glass-panel">
          <div className="panel-header">
            <h3 className="panel-title">📹 Cameras</h3>
            {user?.role === 'ADMIN' && (
              <button 
                className="btn-add-camera" 
                onClick={() => setIsAddModalOpen(true)}
                style={{ padding: '4px 10px', fontSize: '12px', width: 'auto' }}
              >
                + Add
              </button>
            )}
          </div>
          <div className="sidebar-content">
            {cameras.length === 0 ? (
              <p style={{ color: '#475569', fontSize: '14px', marginTop: '20px' }}>No cameras registered.</p>
            ) : (
              cameras.map((cam) => (
                <div
                  key={cam.id}
                  className={`camera-card ${selectedCamera?.id === cam.id ? 'active-card' : ''}`}
                  onClick={() => setSelectedCamera(cam)}
                >
                  <div className="camera-card-top">
                    <span className="camera-name">{cam.name}</span>
                    <span className={`camera-status-dot ${cam.status.toLowerCase()}`}></span>
                  </div>
                  <div className="camera-card-bottom">
                    <span>📍 {cam.location}</span>
                    <span>Source: {cam.rtspUrl.length === 1 ? 'Webcam' : 'Network'}</span>
                  </div>

                  {/* Canva-Style Selection Actions Bar (Admin Only) */}
                  {selectedCamera?.id === cam.id && user?.role === 'ADMIN' && (
                    <div className="camera-card-options-bar" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="options-bar-btn delete-btn"
                        onClick={(e) => handleDeleteCamera(e, cam.id, cam.name)}
                      >
                        🗑️ Delete Camera
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Center Panel: Video Feed */}
        <section className="feed-panel glass-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              🖥️ Live Stream Feed: <span style={{ color: '#c084fc' }}>{selectedCamera?.name || 'None'}</span>
            </h3>
            {selectedCamera && (
              <span className="status-badge active" style={{ padding: '3px 8px', fontSize: '11px' }}>
                <span className="pulse-dot"></span> Live
              </span>
            )}
          </div>
          <div className="feed-content">
            {selectedCamera ? (
              // Point directly to our local python stream port 8000
              // In production we would use the camera's RTSP source or proxy through backend
              <img
                src={`http://localhost:8000/video_feed?camera_id=${selectedCamera.id}`}
                alt="Live Surveillance Stream"
                className="feed-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}

            {/* Error Placeholder fallback */}
            <div className="feed-placeholder" style={{ display: selectedCamera ? 'none' : 'flex' }}>
              <div className="feed-placeholder-icon">📹</div>
              <span style={{ fontSize: '15px' }}>
                {selectedCamera ? 'Camera Stream Offline or Connecting...' : 'Select a camera to start surveillance'}
              </span>
            </div>
          </div>
        </section>

        {/* Right sidebar: Alerts Feed */}
        <section className="alerts-panel glass-panel">
          <div className="panel-header">
            <h3 className="panel-title">🚨 Real-time Security Alerts</h3>
          </div>
          <div className="alerts-content">
            {incidents.length === 0 ? (
              <p style={{ color: '#475569', fontSize: '14px', marginTop: '20px' }}>No security events logged.</p>
            ) : (
              incidents.map((incident) => (
                <div key={incident.id} className={`alert-item severity-${incident.severity}`}>
                  <div className="alert-top">
                    <span className="alert-type">{incident.type.replace('_', ' ')}</span>
                    <span className="alert-time">
                      {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="alert-desc">{incident.description}</p>
                  <div className="alert-footer">
                    <span>📍 {incident.camera?.location || 'Unknown'}</span>
                    <span>•</span>
                    <span>Camera: {incident.camera?.name || 'Main'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Add Camera Modal Dialog */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Register New Camera</h3>
              <button className="btn-close-modal" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            
            {modalError && (
              <div className="auth-alert auth-alert-error" style={{ marginBottom: '16px' }}>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddCamera} className="modal-form">
              <div>
                <label className="modal-label">Camera Name</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Front Gate Entrance"
                  value={camName}
                  onChange={(e) => setCamName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="modal-label">Location</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Lobby / Parking Lot"
                  value={camLocation}
                  onChange={(e) => setCamLocation(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="modal-label">Source Type</label>
                <div className="source-toggle-group">
                  <button
                    type="button"
                    className={`source-toggle-btn ${camSourceType === 'webcam' ? 'selected' : ''}`}
                    onClick={() => handleSourceTypeChange('webcam')}
                  >
                    Webcam (Laptop)
                  </button>
                  <button
                    type="button"
                    className={`source-toggle-btn ${camSourceType === 'rtsp' ? 'selected' : ''}`}
                    onClick={() => handleSourceTypeChange('rtsp')}
                  >
                    IP / RTSP Camera
                  </button>
                </div>
              </div>

              <div>
                <label className="modal-label">
                  {camSourceType === 'webcam' ? 'Webcam Device Index' : 'RTSP Network Address'}
                </label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder={camSourceType === 'webcam' ? '0 or 1' : 'rtsp://ip_address:554/stream'}
                  value={camRtspUrl}
                  onChange={(e) => setCamRtspUrl(e.target.value)}
                  required
                />
              </div>

              <div className="modal-input-row">
                <button
                  type="button"
                  className="modal-btn modal-btn-cancel"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn modal-btn-save"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Save Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
