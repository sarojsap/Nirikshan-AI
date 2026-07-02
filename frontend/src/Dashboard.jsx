import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API, STREAM } from './config';
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
  const [activeTab, setActiveTab] = useState('surveillance'); // 'surveillance' or 'operators'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [contextMenu, setContextMenu] = useState(null); // { x, y, cameraId, cameraName }
  const [isDrawingPerimeter, setIsDrawingPerimeter] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [isDrawingClosed, setIsDrawingClosed] = useState(false);
  const [streamTimestamp, setStreamTimestamp] = useState(() => Date.now());
  const [streamError, setStreamError] = useState('');
  
  // Settings Panel States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [configSchema, setConfigSchema] = useState([]);
  const [settingsValues, setSettingsValues] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const frozenFrameRef = useRef(null);
  const settingsSuccessTimeoutRef = useRef(null);
  
  // Operator Management States
  const [operators, setOperators] = useState([]);
  const [newOpName, setNewOpName] = useState('');
  const [newOpEmail, setNewOpEmail] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  const [opError, setOpError] = useState('');
  const [opSuccess, setOpSuccess] = useState('');
  
  // Add Camera Form States
  const [camName, setCamName] = useState('');
  const [camLocation, setCamLocation] = useState('');
  const [camSourceType, setCamSourceType] = useState('webcam'); // 'webcam' or 'rtsp'
  const [camRtspUrl, setCamRtspUrl] = useState('0');

  const socketRef = useRef(null);

  // Close menus on click outside
  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

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
    } catch {
      console.warn('Audio feedback blocked by browser autoplay policy');
    }
  };

  // Fetch initial cameras and analytics summary
  const fetchData = useCallback(async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const camRes = await fetch(`${API.CAMERAS}`, { headers });
      if (camRes.status === 401) {
        onLogout();
        return;
      }
      if (camRes.ok) {
        const camData = await camRes.json();
        setCameras(camData);
      }

      const statsRes = await fetch(`${API.ANALYTICS}/summary`, { headers });
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
  }, [token, onLogout]);

  const fetchConfigSchema = useCallback(async () => {
    if (!selectedCamera) return;
    setSettingsLoading(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      const res = await fetch(`${API.CAMERAS}/${selectedCamera.id}/config-schema`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        const schemaData = await res.json();
        setConfigSchema(schemaData);
        const vals = {};
        schemaData.forEach(entry => {
          vals[entry.key] = entry.value !== undefined ? entry.value : entry.default;
        });
        setSettingsValues(vals);
      } else {
        const errData = await res.json();
        setSettingsError(errData.error || 'Failed to load configuration schema.');
      }
    } catch (err) {
      setSettingsError('Error loading settings.');
      console.error(err);
    } finally {
      setSettingsLoading(false);
    }
  }, [selectedCamera, token, onLogout]);

  useEffect(() => {
    if (selectedCamera && isSettingsOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchConfigSchema();
    }
  }, [selectedCamera, isSettingsOpen, fetchConfigSchema]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError('');
    setSettingsSuccess('');

    const body = { ...settingsValues };
    const startTime = body.restrictedStartTime;
    const endTime = body.restrictedEndTime;
    if ((startTime && !endTime) || (!startTime && endTime)) {
      body.restrictedStartTime = null;
      body.restrictedEndTime = null;
    }

    try {
      const res = await fetch(`${API.CAMERAS}/${selectedCamera.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings.');
      }

      setSettingsSuccess('Settings applied and saved successfully!');
      
      const updatedCam = data.camera;
      setSelectedCamera(updatedCam);
      setCameras(cameras.map(c => c.id === updatedCam.id ? updatedCam : c));

      if (settingsSuccessTimeoutRef.current) {
        clearTimeout(settingsSuccessTimeoutRef.current);
      }
      settingsSuccessTimeoutRef.current = setTimeout(() => {
        setSettingsSuccess('');
      }, 3000);
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCamera(cameras[0]);
    }
  }, [cameras, selectedCamera]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();

    socketRef.current = io(API.SOCKET, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketRef.current.on('connect', () => {
      console.log(`Connected to incident stream server: ${socketRef.current.id}`);
      fetchData();
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.warn('Disconnected from incident stream server:', reason);
    });

    socketRef.current.on('new_incident', (incident) => {
      console.log('Real-time incident received:', incident);
      playAlertSound();

      setIncidents((prev) => [incident, ...prev.slice(0, 19)]);

      setStats((prev) => ({
        ...prev,
        totalIncidents: prev.totalIncidents + 1,
      }));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (settingsSuccessTimeoutRef.current) {
        clearTimeout(settingsSuccessTimeoutRef.current);
      }
    };
  }, [token, fetchData]);

  const fetchOperators = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const res = await fetch(API.OPERATORS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setOperators(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching operators:', err);
    }
  }, [token, user, onLogout]);

  useEffect(() => {
    if (activeTab === 'operators') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchOperators();
    }
  }, [activeTab, fetchOperators]);

  // Add operator
  const handleAddOperator = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOpError('');
    setOpSuccess('');
    
    try {
      const res = await fetch(API.OPERATORS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newOpName,
          email: newOpEmail,
          password: newOpPassword
        })
      });
      
      if (res.status === 401) {
        onLogout();
        return;
      }
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add operator.');
      }
      
      setOpSuccess('Operator added successfully!');
      setNewOpName('');
      setNewOpEmail('');
      setNewOpPassword('');
      fetchOperators();
    } catch (err) {
      setOpError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete operator
  const handleDeleteOperator = async (opId, opName) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete operator "${opName}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API.OPERATORS}/${opId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete operator.');
      }
      alert('Operator deleted successfully!');
      fetchOperators();
    } catch (err) {
      alert(err.message);
    }
  };

  // Freeze frame and open canvas editor
  const startDrawingMode = () => {
    setIsSettingsOpen(false);
    const img = imgRef.current;
    if (!img) {
      alert("Stream not loaded yet. Please wait for the video feed to load.");
      return;
    }

    const w = img.naturalWidth || img.clientWidth || 640;
    const h = img.naturalHeight || img.clientHeight || 480;

    if (img.naturalWidth === 0 && img.clientWidth === 0) {
      alert("Stream image has not loaded yet. Please wait a moment and try again.");
      return;
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');

    try {
      ctx.drawImage(img, 0, 0, w, h);
      frozenFrameRef.current = offscreen;

      let existingPoints = [];
      if (selectedCamera?.restrictedPolygon) {
        try {
          existingPoints = typeof selectedCamera.restrictedPolygon === 'string'
            ? JSON.parse(selectedCamera.restrictedPolygon)
            : selectedCamera.restrictedPolygon;
        } catch {
          existingPoints = selectedCamera.restrictedPolygon;
        }
      }

      if (!Array.isArray(existingPoints)) {
        existingPoints = [];
      }

      setDrawingPoints(existingPoints);
      setIsDrawingClosed(Array.isArray(existingPoints) && existingPoints.length >= 3);
      setIsDrawingPerimeter(true);
    } catch (err) {
      console.error("Failed to snapshot stream frame:", err);
      setIsDrawingPerimeter(true);
    }
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const frozenCanvas = frozenFrameRef.current;
    
    if (frozenCanvas && (canvas.width !== frozenCanvas.width || canvas.height !== frozenCanvas.height)) {
      canvas.width = frozenCanvas.width;
      canvas.height = frozenCanvas.height;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (frozenCanvas) {
      ctx.drawImage(frozenCanvas, 0, 0, canvas.width, canvas.height);
    }
    
    if (drawingPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
      }
      
      if (mousePos && !isDrawingClosed) {
        ctx.lineTo(mousePos.x, mousePos.y);
      }
      
      if (drawingPoints.length > 2 && (isDrawingClosed || !mousePos)) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fill();
      }
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    drawingPoints.forEach((pt, idx) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = idx === 0 ? '#10b981' : '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [drawingPoints, mousePos, isDrawingClosed]);

  useEffect(() => {
    if (isDrawingPerimeter) {
      redrawCanvas();
    }
  }, [isDrawingPerimeter, redrawCanvas]);

  // Canvas interaction click handlers
  const handleCanvasClick = (e) => {
    if (isDrawingClosed) return; // Prevent adding points when closed
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    const canvasX = Math.round((clientX / rect.width) * canvas.width);
    const canvasY = Math.round((clientY / rect.height) * canvas.height);
    
    // Close polygon if clicking near first point
    if (drawingPoints.length >= 3) {
      const firstPt = drawingPoints[0];
      const dist = Math.sqrt(Math.pow(canvasX - firstPt.x, 2) + Math.pow(canvasY - firstPt.y, 2));
      if (dist < 15) {
        setIsDrawingClosed(true);
        setMousePos(null);
        return;
      }
    }
    
    setDrawingPoints([...drawingPoints, { x: canvasX, y: canvasY }]);
  };

  const handleCanvasMouseMove = (e) => {
    if (isDrawingClosed || drawingPoints.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    const canvasX = Math.round((clientX / rect.width) * canvas.width);
    const canvasY = Math.round((clientY / rect.height) * canvas.height);
    
    setMousePos({ x: canvasX, y: canvasY });
  };

  // Canvas Action controls
  const clearDrawing = async () => {
    if (!selectedCamera) return;

    setDrawingPoints([]);
    setMousePos(null);
    setIsDrawingClosed(false);

    if (selectedCamera.restrictedPolygon) {
      try {
        const res = await fetch(`${API.CAMERAS}/${selectedCamera.id}/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ restrictedPolygon: null })
        });

        if (res.status === 401) {
          onLogout();
          return;
        }

        const data = await res.json();
        if (res.ok) {
          const updatedCam = data.camera;
          setSelectedCamera(updatedCam);
          setCameras(cameras.map(c => c.id === updatedCam.id ? updatedCam : c));
        }
      } catch (err) {
        console.error('Failed to clear perimeter:', err);
      }
    }
  };

  const cancelDrawing = () => {
    setIsDrawingPerimeter(false);
    setDrawingPoints([]);
    setMousePos(null);
    setIsDrawingClosed(false);
    frozenFrameRef.current = null;
  };

  const saveDrawing = async () => {
    if (drawingPoints.length < 3) {
      alert("Please draw a closed perimeter boundary (requires at least 3 points).");
      return;
    }
    
    try {
      const res = await fetch(`${API.CAMERAS}/${selectedCamera.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          restrictedPolygon: drawingPoints
        })
      });
      
      if (res.status === 401) {
        onLogout();
        return;
      }
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save perimeter settings.');
      }
      
      alert("Virtual perimeter zone updated successfully!");
      
      const updatedCam = data.camera;
      setSelectedCamera(updatedCam);
      setCameras(cameras.map(c => c.id === updatedCam.id ? updatedCam : c));
      
      setIsDrawingPerimeter(false);
      setDrawingPoints([]);
      setMousePos(null);
      setIsDrawingClosed(false);
      frozenFrameRef.current = null;
      setStreamTimestamp(Date.now());
    } catch (err) {
      alert(err.message);
    }
  };

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
      const response = await fetch(`${API.CAMERAS}`, {
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
    setContextMenu(null);

    const confirmDelete = window.confirm(`Are you sure you want to delete camera "${camName}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API.CAMERAS}/${camId}`, {
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

  // Right-Click Context Menu handler
  const handleContextMenu = (e, cam) => {
    if (user?.role !== 'ADMIN') return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      cameraId: cam.id,
      cameraName: cam.name,
    });
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

        {user?.role === 'ADMIN' && (
          <div className="header-tabs">
            <button
              className={`tab-btn ${activeTab === 'surveillance' ? 'active' : ''}`}
              onClick={() => setActiveTab('surveillance')}
            >
              🖥️ Surveillance
            </button>
            <button
              className={`tab-btn ${activeTab === 'operators' ? 'active' : ''}`}
              onClick={() => setActiveTab('operators')}
            >
              👥 Operators
            </button>
          </div>
        )}

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
      {activeTab === 'surveillance' || user?.role !== 'ADMIN' ? (
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
                    onContextMenu={(e) => handleContextMenu(e, cam)}
                  >
                    <div className="camera-card-top">
                      <span className="camera-name">{cam.name}</span>
                      <span className={`camera-status-dot ${cam.status.toLowerCase()}`}></span>
                    </div>
                    <div className="camera-card-bottom">
                      <span>📍 {cam.location}</span>
                      <span>Source: {cam.rtspUrl.length === 1 ? 'Webcam' : 'Network'}</span>
                    </div>
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
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {selectedCamera && user?.role === 'ADMIN' && !isDrawingPerimeter && (
                  <>
                    <button
                      className="btn-draw-perimeter"
                      onClick={startDrawingMode}
                    >
                      🚧 Virtual Perimeter
                    </button>
                    <button
                      className="btn-draw-perimeter"
                      style={{
                        background: isSettingsOpen ? 'rgba(170, 59, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        borderColor: isSettingsOpen ? 'rgba(170, 59, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                        color: isSettingsOpen ? '#c084fc' : '#cbd5e1',
                        marginLeft: '8px'
                      }}
                      onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    >
                      ⚙️ AI Settings
                    </button>
                  </>
                )}
                {selectedCamera && (
                  <span className="status-badge active" style={{ padding: '3px 8px', fontSize: '11px', marginLeft: '8px' }}>
                    <span className="pulse-dot"></span> Live
                  </span>
                )}
              </div>
            </div>
            <div className="feed-content" style={{ padding: 0, display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
              <div className="feed-stream-area" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: '#06060c' }}>
                {selectedCamera && (
                  <img
                    ref={imgRef}
                    src={`${STREAM.VIDEO_FEED}?camera_id=${selectedCamera.id}&t=${streamTimestamp}`}
                    alt="Live Surveillance Stream"
                    className="feed-image"
                    style={{ display: isDrawingPerimeter ? 'none' : 'block' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      setStreamError('Stream unavailable. Check if the AI service is running.');
                    }}
                    onLoad={() => setStreamError('')}
                  />
                )}

                {isDrawingPerimeter && (
                  <div className="perimeter-drawing-container">
                    <canvas
                      ref={canvasRef}
                      className="perimeter-canvas"
                      onClick={handleCanvasClick}
                      onMouseMove={handleCanvasMouseMove}
                      style={{ cursor: 'crosshair' }}
                    />
                    <div className="drawing-actions">
                      <button className="drawing-btn btn-clear" onClick={clearDrawing}>🧹 Clear</button>
                      <button className="drawing-btn btn-save" onClick={saveDrawing}>💾 Save Perimeter</button>
                      <button className="drawing-btn btn-cancel" onClick={cancelDrawing}>❌ Cancel</button>
                    </div>
                  </div>
                )}

                {/* Error Placeholder fallback */}
                <div className="feed-placeholder" style={{ display: selectedCamera && !isDrawingPerimeter ? 'none' : 'flex' }}>
                  <div className="feed-placeholder-icon">📹</div>
                  <span style={{ fontSize: '15px' }}>
                    {streamError
                      ? streamError
                      : isDrawingPerimeter
                        ? 'Place at least 3 points, then click near the green start node to close the perimeter.'
                        : selectedCamera
                          ? 'Camera Stream Offline or Connecting...'
                          : 'Select a camera to start surveillance'}
                  </span>
                </div>
              </div>

              {isSettingsOpen && selectedCamera && (
                <div className="settings-side-pane">
                  <div className="settings-pane-header">
                    <h4 className="settings-pane-title">⚙️ AI Parameters</h4>
                    <button 
                      className="btn-close-modal" 
                      onClick={() => setIsSettingsOpen(false)}
                      style={{ fontSize: '18px' }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="settings-pane-content">
                    {settingsError && (
                      <div className="settings-feedback error">
                        {settingsError}
                      </div>
                    )}
                    {settingsSuccess && (
                      <div className="settings-feedback success">
                        {settingsSuccess}
                      </div>
                    )}
                    
                    {settingsLoading && configSchema.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '13px' }}>Loading settings...</p>
                    ) : (
                      Object.entries(
                        configSchema.reduce((acc, entry) => {
                          const cat = entry.category || 'General';
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(entry);
                          return acc;
                        }, {})
                      ).map(([category, entries]) => (
                        <div key={category} className="settings-category-group">
                          <h5 className="settings-category-title">{category}</h5>
                          {entries.map(entry => (
                            <div key={entry.key} className="settings-field-group">
                              <div className="settings-label-row">
                                <span className="settings-field-label">{entry.label}</span>
                                {entry.type !== 'boolean' && entry.type !== 'time' && (
                                  <span className="settings-field-value-badge">
                                    {settingsValues[entry.key]}
                                  </span>
                                )}
                              </div>
                              
                              {entry.type === 'boolean' ? (
                                <label className="settings-switch">
                                  <input
                                    type="checkbox"
                                    checked={!!settingsValues[entry.key]}
                                    onChange={(e) => setSettingsValues({
                                      ...settingsValues,
                                      [entry.key]: e.target.checked
                                    })}
                                  />
                                  <span className="settings-slider-round"></span>
                                </label>
                              ) : entry.type === 'integer' || entry.type === 'float' ? (
                                <input
                                  type="range"
                                  className="settings-range-input"
                                  min={entry.min !== undefined ? entry.min : 0}
                                  max={entry.max !== undefined ? entry.max : 100}
                                  step={entry.step !== undefined ? entry.step : 1}
                                  value={settingsValues[entry.key] !== undefined ? settingsValues[entry.key] : entry.default}
                                  onChange={(e) => setSettingsValues({
                                    ...settingsValues,
                                    [entry.key]: entry.type === 'integer' ? parseInt(e.target.value, 10) : parseFloat(e.target.value)
                                  })}
                                />
                              ) : entry.type === 'time' ? (
                                <input
                                  type="time"
                                  step="1"
                                  className="settings-time-input"
                                  value={settingsValues[entry.key] ? settingsValues[entry.key].substring(0, 8) : ''}
                                  onChange={(e) => {
                                    const newVal = e.target.value || null;
                                    setSettingsValues(prev => {
                                      const next = { ...prev, [entry.key]: newVal };
                                      if (newVal === null) {
                                        next.restrictedStartTime = null;
                                        next.restrictedEndTime = null;
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              ) : (
                                <input
                                  type="text"
                                  className="settings-time-input"
                                  value={settingsValues[entry.key] || ''}
                                  onChange={(e) => setSettingsValues({
                                    ...settingsValues,
                                    [entry.key]: e.target.value
                                  })}
                                />
                              )}
                              <span className="settings-field-description">
                                {entry.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="settings-pane-footer">
                    <button 
                      className="btn-settings-save"
                      onClick={handleSaveSettings}
                      disabled={settingsLoading}
                    >
                      {settingsLoading ? 'Saving...' : '💾 Save Settings'}
                    </button>
                  </div>
                </div>
              )}
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
      ) : (
        <main className="operators-container">
          {/* Left panel: List of Operators */}
          <section className="operator-list-card glass-panel" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ padding: 0 }}>
              <h3 className="panel-title">👥 Registered Operators</h3>
            </div>
            <div className="operator-table-wrapper">
              {operators.length === 0 ? (
                <p style={{ color: '#475569', fontSize: '14px', marginTop: '20px' }}>No operators registered yet.</p>
              ) : (
                <table className="operator-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.map((op) => (
                      <tr key={op.id}>
                        <td>
                          <div className="op-row-name-cell">
                            <div className="operator-avatar">
                              {op.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{op.name}</span>
                          </div>
                        </td>
                        <td style={{ color: '#94a3b8' }}>{op.email}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-delete-op"
                            onClick={() => handleDeleteOperator(op.id, op.name)}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Right panel: Add New Operator */}
          <section className="operator-form-card glass-panel" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ padding: 0 }}>
              <h3 className="panel-title">➕ Add New Operator</h3>
            </div>
            
            <form onSubmit={handleAddOperator} className="op-form-container">
              {opError && (
                <div className="op-feedback-msg error">
                  {opError}
                </div>
              )}
              {opSuccess && (
                <div className="op-feedback-msg success">
                  {opSuccess}
                </div>
              )}

              <div className="op-form-group">
                <label className="modal-label">Operator Name</label>
                <input
                  type="text"
                  className="op-input"
                  placeholder="e.g. John Doe"
                  value={newOpName}
                  onChange={(e) => setNewOpName(e.target.value)}
                  required
                />
              </div>

              <div className="op-form-group">
                <label className="modal-label">Email Address</label>
                <input
                  type="email"
                  className="op-input"
                  placeholder="e.g. john@nirikshan.com"
                  value={newOpEmail}
                  onChange={(e) => setNewOpEmail(e.target.value)}
                  required
                />
              </div>

              <div className="op-form-group">
                <label className="modal-label">Password</label>
                <input
                  type="password"
                  className="op-input"
                  placeholder="At least 6 characters"
                  value={newOpPassword}
                  onChange={(e) => setNewOpPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="btn-save-op"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Create Operator'}
              </button>
            </form>
          </section>
        </main>
      )}

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

      {/* Custom Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="custom-context-menu"
          style={{
            position: 'fixed',
            top: `${Math.min(contextMenu.y, window.innerHeight - 120)}px`,
            left: `${Math.min(contextMenu.x, window.innerWidth - 180)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            style={{ color: '#fbbf24' }}
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu(null);
              const rightClickedCam = cameras.find(c => c.id === contextMenu.cameraId);
              if (rightClickedCam) {
                setSelectedCamera(rightClickedCam);
                setTimeout(() => {
                  startDrawingMode();
                }, 300);
              }
            }}
          >
            🚧 Virtual Perimeter
          </button>
          <button
            className="context-menu-item delete-item"
            onClick={(e) => handleDeleteCamera(e, contextMenu.cameraId, contextMenu.cameraName)}
          >
            🗑️ Delete Camera
          </button>
        </div>
      )}
    </div>
  );
}
