import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API, STREAM, CLOUD_API, detectMode, DEPLOY_MODE } from './config';
import LiveFeedCard from './components/LiveFeedCard';
import AddCameraModal from './components/AddCameraModal';
import SnapshotViewer from './components/SnapshotViewer';
import ContextMenu from './components/ContextMenu';
import AlertsHistoryModal from './components/AlertsHistoryModal';
import SyncStatusBadge from './components/SyncStatusBadge';
import DeviceSettingsPanel from './components/DeviceSettingsPanel';
import CloudDashboard from './components/CloudDashboard';
import CloudIncidents from './components/CloudIncidents';
import CloudDevices from './components/CloudDevices';
import EdgeIncidents from './components/EdgeIncidents';

export default function Dashboard({ token, user, onLogout, mode: initialMode, onModeSwitch }) {
  const [mode, setMode] = useState(initialMode || detectMode());

  const getNavClass = (tabId) => {
    const isActive = activeTab === tabId;
    return isActive
      ? "flex items-center gap-3 py-2.5 rounded-r-xl rounded-l-none text-xs font-bold transition-all pl-[13px] pr-4 bg-soc-cardElevated border-l-[3px] border-l-primary text-white shadow-sm text-left w-full cursor-pointer"
      : "flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-soc-textSecondary hover:bg-white/5 hover:text-white text-left w-full cursor-pointer";
  };
  
  const getIconClass = (tabId) => {
    return activeTab === tabId ? "material-symbols-outlined text-lg text-primary" : "material-symbols-outlined text-lg text-soc-textMuted";
  };
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({
    totalCameras: 0,
    activeCameras: 0,
    totalIncidents: 0,
  });
  const [activeTab, setActiveTab] = useState(() => {
    const m = initialMode || detectMode();
    return m === 'cloud' ? 'dashboard' : 'surveillance';
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCameraDropdownOpen, setIsCameraDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [isDrawingPerimeter, setIsDrawingPerimeter] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [isDrawingClosed, setIsDrawingClosed] = useState(false);
  const [streamTimestamp, setStreamTimestamp] = useState(() => Date.now());
  const [streamError, setStreamError] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [configSchema, setConfigSchema] = useState([]);
  const [settingsValues, setSettingsValues] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [isAlertsHistoryOpen, setIsAlertsHistoryOpen] = useState(false);
  const [operators, setOperators] = useState([]);
  const [newOpName, setNewOpName] = useState('');
  const [newOpEmail, setNewOpEmail] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  const [opError, setOpError] = useState('');
  const [opSuccess, setOpSuccess] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cloudIncidents, setCloudIncidents] = useState([]);
  const [cloudDevices, setCloudDevices] = useState([]);
  const [settingsPageCameraId, setSettingsPageCameraId] = useState('');
  const [settingsPageSchema, setSettingsPageSchema] = useState([]);
  const [settingsPageValues, setSettingsPageValues] = useState({});
  const [settingsPageLoading, setSettingsPageLoading] = useState(false);
  const [settingsPageError, setSettingsPageError] = useState('');
  const [settingsPageSuccess, setSettingsPageSuccess] = useState('');

  const streamCanvasRef = useRef(null);
  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const frozenFrameRef = useRef(null);
  const settingsSuccessTimeoutRef = useRef(null);
  const playerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    setActiveTab(mode === 'cloud' ? 'dashboard' : 'surveillance');
    setIsSettingsOpen(false);
    setSelectedSnapshot(null);
  }, [mode]);

  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu(null);
      setIsCameraDropdownOpen(false);
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
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

  const fetchOperators = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const res = await fetch(API.OPERATORS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { onLogout(); return; }
      if (res.ok) {
        const data = await res.json();
        setOperators(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching operators:', err);
    }
  }, [token, user, onLogout]);

  const fetchData = useCallback(async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const camRes = await fetch(`${API.CAMERAS}`, { headers });
      if (camRes.status === 401) { onLogout(); return; }
      if (camRes.ok) {
        const camData = await camRes.json();
        setCameras(camData);
      }
      const statsRes = await fetch(`${API.ANALYTICS}/summary`, { headers });
      if (statsRes.status === 401) { onLogout(); return; }
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
      if (res.status === 401) { onLogout(); return; }
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
    } finally {
      setSettingsLoading(false);
    }
  }, [selectedCamera, token, onLogout]);

  useEffect(() => {
    if (selectedCamera && isSettingsOpen) {
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings.');
      setSettingsSuccess('Settings applied and saved successfully!');
      const updatedCam = data.camera;
      setSelectedCamera(updatedCam);
      setCameras(cameras.map(c => c.id === updatedCam.id ? updatedCam : c));
      if (settingsSuccessTimeoutRef.current) clearTimeout(settingsSuccessTimeoutRef.current);
      settingsSuccessTimeoutRef.current = setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0]);
    }
  }, [cameras, selectedCamera]);

  useEffect(() => {
    if (cameras.length > 0 && !settingsPageCameraId) {
      setSettingsPageCameraId(cameras[0].id);
    }
  }, [cameras, settingsPageCameraId]);

  useEffect(() => {
    if (mode === 'edge' && activeTab === 'settings' && settingsPageCameraId) {
      const fetchSettingsConfig = async () => {
        setSettingsPageLoading(true);
        setSettingsPageError('');
        setSettingsPageSuccess('');
        try {
          const res = await fetch(`${API.CAMERAS}/${settingsPageCameraId}/config-schema`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.status === 401) { onLogout(); return; }
          if (res.ok) {
            const schemaData = await res.json();
            setSettingsPageSchema(schemaData);
            const vals = {};
            schemaData.forEach(entry => { vals[entry.key] = entry.value !== undefined ? entry.value : entry.default; });
            setSettingsPageValues(vals);
          } else {
            const data = await res.json();
            setSettingsPageError(data.error || 'Failed to load camera settings.');
          }
        } catch (err) {
          setSettingsPageError('Connection error. Failed to load camera settings.');
        } finally {
          setSettingsPageLoading(false);
        }
      };
      fetchSettingsConfig();
    }
  }, [activeTab, settingsPageCameraId, token, onLogout]);

  const handleSaveSettingsPage = async (e) => {
    e.preventDefault();
    setSettingsPageLoading(true);
    setSettingsPageError('');
    setSettingsPageSuccess('');

    const body = { ...settingsPageValues };
    const startTime = body.restrictedStartTime;
    const endTime = body.restrictedEndTime;
    if ((startTime && !endTime) || (!startTime && endTime)) {
      body.restrictedStartTime = null;
      body.restrictedEndTime = null;
    }

    try {
      const res = await fetch(`${API.CAMERAS}/${settingsPageCameraId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings.');
      setSettingsPageSuccess('Settings saved successfully!');
      const updatedCam = data.camera;
      if (selectedCamera?.id === updatedCam.id) setSelectedCamera(updatedCam);
      setCameras(cameras.map(c => c.id === updatedCam.id ? updatedCam : c));
    } catch (err) {
      setSettingsPageError(err.message);
    } finally {
      setSettingsPageLoading(false);
    }
  };

  const fetchCloudDevices = useCallback(async () => {
    if (mode !== 'cloud') return;
    try {
      const res = await fetch(CLOUD_API.DEVICES, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onLogout?.(); return; }
      if (res.ok) {
        const body = await res.json();
        setCloudDevices(body.data ?? body);
      }
    } catch { /* ignore */ }
  }, [token, onLogout, mode]);

  useEffect(() => {
    if (mode === 'edge') {
      fetchData();
      socketRef.current = io(API.SOCKET, { transports: ['websocket', 'polling'], reconnection: true });
      socketRef.current.on('connect', () => { fetchData(); });
      socketRef.current.on('connect_error', (err) => console.error('Socket connection error:', err.message));
      socketRef.current.on('disconnect', (reason) => console.warn('Disconnected from incident stream server:', reason));
      socketRef.current.on('new_incident', (incident) => {
        playAlertSound();
        setIncidents((prev) => [incident, ...prev.slice(0, 19)]);
        setStats((prev) => ({ ...prev, totalIncidents: prev.totalIncidents + 1 }));
      });
    } else {
      fetchCloudDevices();
      socketRef.current = io(CLOUD_API.SOCKET, { transports: ['websocket', 'polling'], reconnection: true, auth: { token } });
      socketRef.current.on('new_incident', (incident) => {
        playAlertSound();
        setCloudIncidents((prev) => [incident, ...prev.slice(0, 19)]);
      });
      const interval = setInterval(fetchCloudDevices, 30000);
      return () => clearInterval(interval);
    }
    return () => {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      if (settingsSuccessTimeoutRef.current) clearTimeout(settingsSuccessTimeoutRef.current);
    };
  }, [token, fetchData, fetchCloudDevices, mode]);

  useEffect(() => {
    if (!selectedCamera || isDrawingPerimeter || mode !== 'edge') return;
    const cameraId = selectedCamera.id;
    const url = `${STREAM.WS}/video_feed?camera_id=${cameraId}`;
    let ws = new WebSocket(url);
    ws.binaryType = 'blob';
    ws.onopen = () => setStreamError('');
    ws.onmessage = (event) => {
      const canvas = streamCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const blob = event.data;
      const img = new Image();
      img.onload = () => {
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(blob);
    };
    ws.onerror = () => setStreamError('Stream unavailable. Check if the AI service is running.');
    ws.onclose = () => { if (ws === wsRef.current) setStreamError('Stream disconnected. Attempting reconnect...'); };
    wsRef.current = ws;
    return () => {
      if (wsRef.current === ws) { ws.close(); wsRef.current = null; }
    };
  }, [selectedCamera?.id, isDrawingPerimeter]);

  useEffect(() => {
    if (activeTab === 'operators') fetchOperators();
  }, [activeTab, fetchOperators]);

  const handleAddOperator = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOpError('');
    setOpSuccess('');
    try {
      const res = await fetch(API.OPERATORS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newOpName, email: newOpEmail, password: newOpPassword })
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add operator.');
      setOpSuccess('Operator added successfully!');
      setNewOpName(''); setNewOpEmail(''); setNewOpPassword('');
      fetchOperators();
    } catch (err) { setOpError(err.message); }
    finally { setLoading(false); }
  };

  const handleDeleteOperator = async (opId, opName) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete operator "${opName}"?`);
    if (!confirmDelete) return;
    try {
      const res = await fetch(`${API.OPERATORS}/${opId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { onLogout(); return; }
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to delete operator.'); }
      alert('Operator deleted successfully!');
      fetchOperators();
    } catch (err) { alert(err.message); }
  };

  const startDrawingMode = () => {
    setIsSettingsOpen(false);
    const canvas = streamCanvasRef.current;
    if (!canvas) { alert("Stream not loaded yet."); return; }
    const w = canvas.width || canvas.clientWidth || 640;
    const h = canvas.height || canvas.clientHeight || 480;
    if (canvas.width === 0 && canvas.clientWidth === 0) { alert("Stream image has not loaded yet."); return; }
    const offscreen = document.createElement('canvas');
    offscreen.width = w; offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    try {
      ctx.drawImage(canvas, 0, 0, w, h);
      frozenFrameRef.current = offscreen;
      let existingPoints = [];
      if (selectedCamera?.restrictedPolygon) {
        try {
          existingPoints = typeof selectedCamera.restrictedPolygon === 'string'
            ? JSON.parse(selectedCamera.restrictedPolygon) : selectedCamera.restrictedPolygon;
        } catch { existingPoints = selectedCamera.restrictedPolygon; }
      }
      if (!Array.isArray(existingPoints)) existingPoints = [];
      setDrawingPoints(existingPoints);
      setIsDrawingClosed(Array.isArray(existingPoints) && existingPoints.length >= 3);
      setIsDrawingPerimeter(true);
    } catch (err) {
      console.error("Failed to snapshot stream frame:", err);
      setIsDrawingPerimeter(true);
    }
  };

  const handleContextMenu = (e, cam) => {
    if (user?.role !== 'ADMIN') return;
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, cameraId: cam.id, cameraName: cam.name });
  };

  const handleContextDrawPerimeter = (cameraId) => {
    const rightClickedCam = cameras.find(c => c.id === cameraId);
    if (rightClickedCam) {
      setSelectedCamera(rightClickedCam);
      setTimeout(() => startDrawingMode(), 300);
    }
  };

  const handleDeleteCamera = async (e, camId, camName) => {
    e.stopPropagation();
    setContextMenu(null);
    const confirmDelete = window.confirm(`Are you sure you want to delete camera "${camName}"? This action cannot be undone.`);
    if (!confirmDelete) return;
    try {
      const response = await fetch(`${API.CAMERAS}/${camId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401) { onLogout(); return; }
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to delete camera.'); }
      if (selectedCamera?.id === camId) setSelectedCamera(null);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const frozenCanvas = frozenFrameRef.current;
    if (frozenCanvas && (canvas.width !== frozenCanvas.width || canvas.height !== frozenCanvas.height)) {
      canvas.width = frozenCanvas.width; canvas.height = frozenCanvas.height;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (frozenCanvas) ctx.drawImage(frozenCanvas, 0, 0, canvas.width, canvas.height);
    if (drawingPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      for (let i = 1; i < drawingPoints.length; i++) ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
      if (mousePos && !isDrawingClosed) ctx.lineTo(mousePos.x, mousePos.y);
      if (drawingPoints.length > 2 && (isDrawingClosed || !mousePos)) { ctx.closePath(); ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; ctx.fill(); }
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.stroke();
    }
    drawingPoints.forEach((pt, idx) => {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = idx === 0 ? '#10b981' : '#ef4444'; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    });
  }, [drawingPoints, mousePos, isDrawingClosed]);

  useEffect(() => { if (isDrawingPerimeter) redrawCanvas(); }, [isDrawingPerimeter, redrawCanvas]);

  const handleCanvasClick = (e) => {
    if (isDrawingClosed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const canvasX = Math.round((clientX / rect.width) * canvas.width);
    const canvasY = Math.round((clientY / rect.height) * canvas.height);
    if (drawingPoints.length >= 3) {
      const firstPt = drawingPoints[0];
      const dist = Math.sqrt(Math.pow(canvasX - firstPt.x, 2) + Math.pow(canvasY - firstPt.y, 2));
      if (dist < 15) { setIsDrawingClosed(true); setMousePos(null); return; }
    }
    setDrawingPoints([...drawingPoints, { x: canvasX, y: canvasY }]);
  };

  const handleCanvasMouseMove = (e) => {
    if (isDrawingClosed || drawingPoints.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
    const canvasY = Math.round(((e.clientY - rect.top) / rect.height) * canvas.height);
    setMousePos({ x: canvasX, y: canvasY });
  };

  const clearDrawing = async () => {
    if (!selectedCamera) return;
    setDrawingPoints([]); setMousePos(null); setIsDrawingClosed(false);
    if (selectedCamera.restrictedPolygon) {
      try {
        const res = await fetch(`${API.CAMERAS}/${selectedCamera.id}/settings`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ restrictedPolygon: null })
        });
        if (res.status === 401) { onLogout(); return; }
        const data = await res.json();
        if (res.ok) { const updatedCam = data.camera; setSelectedCamera(updatedCam); setCameras(cameras.map(c => c.id === updatedCam.id ? updatedCam : c)); }
      } catch (err) { console.error('Failed to clear perimeter:', err); }
    }
  };

  const cancelDrawing = () => {
    setIsDrawingPerimeter(false); setDrawingPoints([]); setMousePos(null);
    setIsDrawingClosed(false); frozenFrameRef.current = null;
  };

  const saveDrawing = async () => {
    if (drawingPoints.length < 3) { alert("Please draw a closed perimeter boundary (requires at least 3 points)."); return; }
    try {
      const res = await fetch(`${API.CAMERAS}/${selectedCamera.id}/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ restrictedPolygon: drawingPoints })
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save perimeter settings.');
      alert("Virtual perimeter zone updated successfully!");
      const updatedCam = data.camera;
      setSelectedCamera(updatedCam);
      setCameras(cameras.map(c => c.id === updatedCam.id ? updatedCam : c));
      setIsDrawingPerimeter(false); setDrawingPoints([]); setMousePos(null);
      setIsDrawingClosed(false); frozenFrameRef.current = null;
      setStreamTimestamp(Date.now());
    } catch (err) { alert(err.message); }
  };

  const handleFullscreen = () => {
    if (!playerRef.current) return;
    if (document.fullscreenElement) { document.exitFullscreen(); }
    else { playerRef.current.requestFullscreen().catch(err => console.error(`Error attempting to enable fullscreen: ${err.message}`)); }
  };

  return (
    <div className="h-screen w-screen overflow-hidden text-soc-textSecondary antialiased flex bg-soc-bg relative font-sans select-none">
      <aside className="w-72 bg-soc-sidebar border-r border-soc-border flex flex-col p-6 shrink-0 h-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-xl">visibility</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-soc-textPrimary uppercase font-sans">Nirikshan AI</h1>
            <p className="text-[10px] text-soc-textMuted uppercase tracking-widest font-semibold font-sans">Command Console</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto flex-1 pr-1">
          {mode === 'edge' ? (
            <>
              <div className="flex flex-col gap-1">
                <button onClick={() => setActiveTab('surveillance')} className={getNavClass('surveillance')}>
                  <span className={getIconClass('surveillance')}>dashboard</span><span>Dashboard</span>
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-soc-textMuted uppercase tracking-wider px-4 mb-1">Monitoring</span>
                <button onClick={() => setActiveTab('surveillance')} className={getNavClass('surveillance')}>
                  <span className={getIconClass('surveillance')}>videocam</span><span>Camera Registry</span>
                </button>
                <button onClick={() => setActiveTab('live_feeds')} className={getNavClass('live_feeds')}>
                  <span className={getIconClass('live_feeds')}>live_tv</span><span>Live Feeds</span>
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-soc-textMuted uppercase tracking-wider px-4 mb-1">Alerts & Events</span>
                <button onClick={() => setActiveTab('alerts')} className={getNavClass('alerts')}>
                  <div className="flex items-center gap-3">
                    <span className={getIconClass('alerts')}>notifications_active</span>
                    <span>Alerts</span>
                  </div>
                  <span className="bg-soc-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.totalIncidents || 0}</span>
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-soc-textMuted uppercase tracking-wider px-4 mb-1">System</span>
                {user?.role === 'ADMIN' && (
                  <button onClick={() => setActiveTab('operators')} className={getNavClass('operators')}>
                    <span className={getIconClass('operators')}>manage_accounts</span><span>Operators</span>
                  </button>
                )}
                {user?.role === 'ADMIN' && (
                  <button onClick={() => setActiveTab('settings')} className={getNavClass('settings')}>
                    <span className={getIconClass('settings')}>settings</span><span>Settings</span>
                  </button>
                )}
                <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed text-left">
                  <span className="material-symbols-outlined text-lg text-slate-700">receipt_long</span><span>Audit Logs</span>
                </button>
              </div>

              <SyncStatusBadge token={token} onLogout={onLogout} />

              <div className="flex flex-col gap-1 mt-2 min-h-0 overflow-hidden border-t border-soc-border pt-4">
                <div className="flex justify-between items-center px-4 mb-2 shrink-0">
                  <span className="text-[10px] font-bold text-soc-textMuted uppercase tracking-wider">Cameras</span>
                  <span className="bg-soc-success/10 text-soc-success text-[8px] font-mono px-1.5 py-0.5 rounded border border-soc-success/20 font-bold shrink-0">
                    {cameras.filter(c => c.status === 'ACTIVE').length} / {cameras.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto pr-1 max-h-[220px]">
                  {cameras.length === 0 ? (
                    <span className="text-slate-500 text-[10px] px-4 py-2">No cameras registered.</span>
                  ) : (
                    cameras.map((cam) => (
                      <button key={cam.id} onClick={() => { setActiveTab('surveillance'); setSelectedCamera(cam); }} onContextMenu={(e) => handleContextMenu(e, cam)} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left w-full border ${selectedCamera?.id === cam.id ? 'bg-soc-cardElevated border-primary/30 text-white font-bold' : 'hover:bg-white/5 bg-transparent border-transparent text-soc-textSecondary'}`}>
                        <div className="flex items-center gap-2 truncate flex-1 mr-2">
                          <span className="material-symbols-outlined text-base shrink-0">{cam.rtspUrl.length === 1 ? 'videocam' : 'sensors'}</span>
                          <span className="truncate text-[11px] font-sans">{cam.name}</span>
                        </div>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cam.status === 'ACTIVE' ? 'bg-soc-success shadow-[0_0_6px_#22c55e]' : 'bg-soc-danger'}`} />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <button onClick={() => setActiveTab('dashboard')} className={getNavClass('dashboard')}>
                  <span className={getIconClass('dashboard')}>dashboard</span><span>Dashboard</span>
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-soc-textMuted uppercase tracking-wider px-4 mb-1">Data</span>
                <button onClick={() => setActiveTab('incidents')} className={getNavClass('incidents')}>
                  <span className={getIconClass('incidents')}>warning</span><span>Incidents</span>
                </button>
                <button onClick={() => setActiveTab('devices')} className={getNavClass('devices')}>
                  <span className={getIconClass('devices')}>devices</span><span>Devices</span>
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-soc-textMuted uppercase tracking-wider px-4 mb-1">System</span>
                <button onClick={() => setActiveTab('settings')} className={getNavClass('settings')}>
                  <span className={getIconClass('settings')}>settings</span><span>Settings</span>
                </button>
              </div>

              <div className="flex flex-col gap-1 mt-2 min-h-0 overflow-hidden border-t border-soc-border pt-4">
                <div className="flex justify-between items-center px-4 mb-2 shrink-0">
                  <span className="text-[10px] font-bold text-soc-textMuted uppercase tracking-wider">Devices</span>
                  <span className="bg-primary/10 text-primary text-[8px] font-mono px-1.5 py-0.5 rounded border border-primary/20 font-bold shrink-0">
                    {cloudDevices.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto pr-1 max-h-[220px]">
                  {cloudDevices.length === 0 ? (
                    <span className="text-slate-500 text-[10px] px-4 py-2">No devices registered.</span>
                  ) : (
                    cloudDevices.map((d) => (
                      <button key={d.id} onClick={() => setActiveTab('devices')} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left w-full border hover:bg-white/5 bg-transparent border-transparent text-soc-textSecondary">
                        <div className="flex items-center gap-2 truncate flex-1 mr-2">
                          <span className="material-symbols-outlined text-base shrink-0">devices</span>
                          <span className="truncate text-[11px] font-sans">{d.name}</span>
                        </div>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${d.isActive !== false ? 'bg-soc-success shadow-[0_0_6px_#22c55e]' : 'bg-soc-danger'}`} />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <nav className="bg-soc-sidebar border-b border-soc-border h-20 px-8 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-6 ml-4">
            {mode === 'edge' ? (
              <>
                <button className={`pb-1 text-sm font-semibold transition-all border-b-2 ${activeTab === 'surveillance' ? 'text-white border-primary' : 'text-soc-textMuted border-transparent hover:text-white'}`} onClick={() => setActiveTab('surveillance')}>Surveillance</button>
                <button className={`pb-1 text-sm font-semibold transition-all border-b-2 ${activeTab === 'alerts' ? 'text-white border-primary' : 'text-soc-textMuted border-transparent hover:text-white'}`} onClick={() => setActiveTab('alerts')}>Alerts</button>
                {user?.role === 'ADMIN' && (
                  <button className={`pb-1 text-sm font-semibold transition-all border-b-2 ${activeTab === 'operators' ? 'text-white border-primary' : 'text-soc-textMuted border-transparent hover:text-white'}`} onClick={() => setActiveTab('operators')}>Operators</button>
                )}
              </>
            ) : (
              <>
                <button className={`pb-1 text-sm font-semibold transition-all border-b-2 ${activeTab === 'dashboard' ? 'text-white border-primary' : 'text-soc-textMuted border-transparent hover:text-white'}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
                <button className={`pb-1 text-sm font-semibold transition-all border-b-2 ${activeTab === 'incidents' ? 'text-white border-primary' : 'text-soc-textMuted border-transparent hover:text-white'}`} onClick={() => setActiveTab('incidents')}>Incidents</button>
                <button className={`pb-1 text-sm font-semibold transition-all border-b-2 ${activeTab === 'devices' ? 'text-white border-primary' : 'text-soc-textMuted border-transparent hover:text-white'}`} onClick={() => setActiveTab('devices')}>Devices</button>
                <button className={`pb-1 text-sm font-semibold transition-all border-b-2 ${activeTab === 'settings' ? 'text-white border-primary' : 'text-soc-textMuted border-transparent hover:text-white'}`} onClick={() => setActiveTab('settings')}>Settings</button>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {!DEPLOY_MODE && (
              <button
                onClick={() => onModeSwitch?.(mode === 'cloud' ? 'edge' : 'cloud')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                  mode === 'cloud'
                    ? 'bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20'
                    : 'bg-soc-success/10 border border-soc-success/20 text-soc-success hover:bg-soc-success/20'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{mode === 'cloud' ? 'cloud' : 'lan'}</span>
                <span>{mode === 'cloud' ? 'Cloud' : 'Edge'}</span>
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-soc-textPrimary leading-tight">{user?.name || 'Super Admin'}</p>
                <p className="text-[10px] text-soc-textMuted font-semibold uppercase tracking-wider">{user?.role || 'Administrator'}</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-soc-border bg-soc-sidebar flex items-center justify-center text-primary text-lg font-bold">{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</div>
            </div>
            <div className="h-6 w-px bg-soc-border"></div>
            <button onClick={onLogout} className="text-soc-textSecondary hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors py-2 px-3 hover:bg-white/5 border border-soc-border rounded-xl cursor-pointer">
              <span className="material-symbols-outlined text-base">logout</span><span>Sign Out</span>
            </button>
          </div>
        </nav>

        {mode === 'cloud' ? (
          <div className="flex-1 flex overflow-hidden p-6 gap-6 min-h-0 w-full">
            {activeTab === 'dashboard' && (
              <CloudDashboard
                token={token}
                onLogout={onLogout}
                onSelectIncident={(inc) => setSelectedSnapshot(inc)}
              />
            )}
            {activeTab === 'incidents' && (
              <CloudIncidents
                token={token}
                onLogout={onLogout}
                onSelectIncident={(inc) => setSelectedSnapshot(inc)}
              />
            )}
            {activeTab === 'devices' && (
              <CloudDevices
                token={token}
                onLogout={onLogout}
              />
            )}
            {activeTab === 'settings' && (
              <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Cloud Settings</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Remote device configuration</p>
                </div>
                <DeviceSettingsPanel token={token} onLogout={onLogout} />
              </div>
            )}
          </div>
        ) : (activeTab === 'surveillance' || activeTab === 'live_feeds' || user?.role !== 'ADMIN') && activeTab !== 'alerts' ? (
          <div className="flex-1 flex overflow-hidden p-6 gap-6 min-h-0 w-full">
            {activeTab === 'live_feeds' ? (
              <div className="flex-1 h-full min-h-0 flex flex-col gap-6 overflow-y-auto pr-1">
                <div className="flex justify-between items-center shrink-0">
                  <div><h2 className="text-xl font-bold text-white tracking-tight">Live Feeds</h2><p className="text-xs text-slate-400 mt-0.5">Simultaneous multi-camera grid monitor</p></div>
                  <span className="bg-[#0c1524] border border-[#162235] px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Grid Mode: {cameras.length <= 1 ? '1x1' : cameras.length <= 4 ? '2x2' : '3x3'}</span>
                </div>
                <div className="flex-1 min-h-0">
                  {cameras.length === 0 ? (
                    <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-8 text-center text-slate-500 text-xs">No cameras registered to show live feeds.</div>
                  ) : (
                    <div className={`grid gap-4 ${cameras.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                      {cameras.map((cam) => (
                        <LiveFeedCard key={cam.id} cam={cam} onDelete={handleDeleteCamera} onClick={() => { setSelectedCamera(cam); setActiveTab('surveillance'); }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 h-full min-h-0 flex flex-col gap-6 overflow-y-auto pr-1">
                <div className="flex justify-between items-center shrink-0">
                  <div><h2 className="text-xl font-bold text-soc-textPrimary tracking-tight">Camera Registry</h2><p className="text-xs text-soc-textMuted mt-0.5">Monitor and manage all connected cameras</p></div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setIsCameraDropdownOpen(!isCameraDropdownOpen); }} className="flex items-center gap-2 px-4 py-2 border border-soc-border bg-soc-card hover:bg-soc-cardElevated text-soc-textSecondary hover:text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer">
                        <span className="material-symbols-outlined text-sm">videocam</span>
                        <span>{selectedCamera ? selectedCamera.name : 'Choose Camera'}</span>
                        <span className="material-symbols-outlined text-xs ml-1 select-none">{isCameraDropdownOpen ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {isCameraDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-soc-sidebar border border-soc-border rounded-xl shadow-2xl z-50 py-1.5 flex flex-col min-w-[200px] font-sans" onClick={(e) => e.stopPropagation()}>
                          <div className="px-3 py-1.5 text-[10px] font-bold text-soc-textMuted uppercase tracking-wider border-b border-soc-border mb-1 select-none">Select Camera Source</div>
                          <div className="max-h-60 overflow-y-auto">
                            {cameras.length === 0 ? (
                               <div className="px-4 py-2.5 text-xs text-soc-textMuted select-none">No cameras registered.</div>
                            ) : (
                              cameras.map((cam) => (
                                <button key={cam.id} onClick={() => { setSelectedCamera(cam); setIsCameraDropdownOpen(false); }} className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left transition-colors ${selectedCamera?.id === cam.id ? 'bg-primary/10 text-primary font-bold' : 'text-soc-textSecondary hover:bg-white/5 hover:text-white'}`}>
                                  <span className="truncate flex-1 mr-2">{cam.name}</span>
                                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cam.status === 'ACTIVE' ? 'bg-soc-success shadow-[0_0_6px_#22c55e]' : 'bg-soc-danger'}`} />
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {user?.role === 'ADMIN' && (
                      <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                        <span className="material-symbols-outlined text-sm">add</span><span>Add Camera</span>
                      </button>
                    )}
                  </div>
                </div>

                 <div ref={playerRef} className="bg-soc-sidebar border border-soc-border rounded-2xl relative overflow-hidden flex flex-col aspect-video w-full shadow-2xl shrink-0">
                  {selectedCamera && (
                    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-white drop-shadow-md">{selectedCamera.name}</h3>
                          <span className="bg-soc-success/10 text-soc-success border border-soc-success/20 px-2 py-0.5 rounded-full font-bold text-[9px] flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-soc-success rounded-full animate-pulse"></span><span>LIVE</span>
                          </span>
                        </div>
                        <p className="text-[10px] text-soc-textMuted flex items-center gap-0.5 mt-0.5">
                          <span className="material-symbols-outlined text-[10px]">location_on</span>
                          <span>{selectedCamera.location}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {user?.role === 'ADMIN' && !isDrawingPerimeter && (
                          <button onClick={startDrawingMode} className="px-3 py-1.5 text-[10px] bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary rounded-xl transition-all flex items-center gap-1.5 font-bold shadow-sm cursor-pointer">
                            <span className="material-symbols-outlined text-sm">polyline</span><span>Virtual Perimeter</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                    {isDrawingPerimeter ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/60 z-20">
                        <canvas ref={canvasRef} className="max-h-[80%] max-w-full rounded-lg border border-white/10 shadow-2xl bg-slate-950" onClick={handleCanvasClick} onMouseMove={handleCanvasMouseMove} style={{ cursor: 'crosshair' }} />
                        <div className="mt-3 text-center bg-soc-sidebar/95 border border-soc-border px-4 py-2 rounded-xl max-w-md shadow-2xl">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Perimeter Drawing Mode</p>
                          <p className="text-[10px] text-soc-textSecondary">Click to place points. Connect back to the green start node to close the loop.</p>
                        </div>
                      </div>
                    ) : selectedCamera ? (
                      <canvas ref={streamCanvasRef} className="w-full h-full object-cover" />
                    ) : null}

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-soc-bg" style={{ display: (selectedCamera && !streamError) || isDrawingPerimeter ? 'none' : 'flex' }}>
                      <div className="w-14 h-14 rounded-full bg-soc-card flex items-center justify-center mb-4 text-primary border border-soc-border">
                        <span className="material-symbols-outlined text-2xl">videocam_off</span>
                      </div>
                      <span className="text-soc-textMuted text-xs max-w-md px-6 leading-relaxed">
                        {streamError ? streamError : 'Select a camera card from the left sidebar to start monitoring'}
                      </span>
                      {selectedCamera && streamError && (
                        <button onClick={() => { setStreamError(''); setStreamTimestamp(Date.now()); }} className="mt-4 px-3 py-1.5 bg-soc-card hover:bg-soc-cardElevated border border-soc-border text-soc-textSecondary hover:text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer">
                          <span className="material-symbols-outlined text-sm">refresh</span><span>Retry Connection</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedCamera && (
                    <div className="bg-soc-card border-t border-soc-border px-4 py-3 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-soc-textSecondary">
                          <span className="material-symbols-outlined text-sm">videocam</span><span>Webcam</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-soc-textMuted">
                        <button onClick={handleFullscreen} className="hover:text-white transition-colors flex items-center justify-center" title="Toggle Fullscreen">
                          <span className="material-symbols-outlined text-base">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                        </button>
                        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="hover:text-white transition-colors flex items-center justify-center">
                          <span className="material-symbols-outlined text-base">settings</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isDrawingPerimeter && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-soc-card/90 backdrop-blur-md px-4 py-2 border border-soc-border rounded-xl flex items-center gap-3 z-30 shadow-2xl">
                      <button className="px-3 py-1 bg-soc-sidebar hover:bg-white/5 border border-soc-border rounded-lg text-[10px] font-semibold text-soc-textSecondary hover:text-white flex items-center gap-1 cursor-pointer" onClick={clearDrawing}>
                        <span className="material-symbols-outlined text-[12px]">delete</span><span>Clear</span>
                      </button>
                      <button className="px-3 py-1 bg-primary hover:bg-primary-hover text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm cursor-pointer" onClick={saveDrawing}>
                        <span className="material-symbols-outlined text-[12px]">save</span><span>Save Perimeter</span>
                      </button>
                      <button className="px-3 py-1 bg-soc-danger/10 hover:bg-soc-danger/25 border border-soc-danger/20 text-soc-danger rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer" onClick={cancelDrawing}>
                        <span className="material-symbols-outlined text-[12px]">close</span><span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab !== 'live_feeds' && (
              <aside className="w-80 bg-soc-sidebar border border-soc-border rounded-2xl flex flex-col shrink-0 h-full overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-soc-border flex justify-between items-center shrink-0">
                  <div><h2 className="text-xs font-bold text-soc-textPrimary uppercase tracking-wider">Security Alerts</h2><p className="text-[10px] text-soc-textMuted">Real-time feed</p></div>
                  <button onClick={() => setIsAlertsHistoryOpen(true)} className="text-soc-textSecondary hover:text-white border border-soc-border bg-soc-card px-3 py-1 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer">View All</button>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto p-4 flex-1">
                  {incidents.length === 0 ? (
                    <p className="text-soc-textMuted text-xs p-2">No alerts logged.</p>
                  ) : (
                    incidents.map((incident) => {
                      const isCritical = incident.severity === 'CRITICAL';
                      const isWarning = incident.severity === 'WARNING' || incident.severity === 'HIGH' || incident.type.includes('CROWD');
                      let borderClass = 'border-l-soc-info';
                      let titleClass = 'text-soc-info';
                      if (isCritical) { borderClass = 'border-l-soc-danger'; titleClass = 'text-soc-danger'; }
                      else if (isWarning) { borderClass = 'border-l-soc-warning'; titleClass = 'text-soc-warning'; }
                      return (
                        <div key={incident.id} onClick={() => setSelectedSnapshot(incident)} className={`bg-soc-card border border-soc-border p-3 rounded-xl border-l-4 relative overflow-hidden group flex-shrink-0 h-auto cursor-pointer hover:border-primary/50 transition-all ${borderClass}`}>
                          <div className="relative z-10 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-bold tracking-wide uppercase ${titleClass}`}>{incident.type}</span>
                              <span className="text-[9px] text-soc-textMuted font-mono">{new Date(incident.timestamp || incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-soc-textSecondary leading-normal font-medium">{incident.description}</p>
                            <div className="flex items-center gap-1 text-[9px] text-soc-textMuted mt-1 font-sans">
                              <span className="material-symbols-outlined text-[10px]">location_on</span>
                              <span>{incident.camera ? incident.camera.location : incident.location || 'Surveillance Area'}</span>
                            </div>
                            {incident.imageUrl && (
                              <div className="mt-2 relative rounded-lg overflow-hidden border border-soc-border aspect-video bg-black/50 group/thumb">
                                <img src={incident.imageUrl} alt="Incident snapshot thumbnail" className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105" />
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="material-symbols-outlined text-white text-base">zoom_in</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-3 border-t border-soc-border bg-soc-sidebar shrink-0">
                  <button onClick={() => setIsAlertsHistoryOpen(true)} className="w-full bg-soc-card hover:bg-soc-cardElevated text-soc-textSecondary hover:text-white border border-soc-border rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer">
                    <span>View All Alerts</span><span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              </aside>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="flex-1 flex flex-col p-6 gap-6 min-h-0 w-full overflow-y-auto pr-1">
            <div className="flex justify-between items-center shrink-0">
              <div><h2 className="text-xl font-bold text-soc-textPrimary tracking-tight">System Settings</h2><p className="text-xs text-soc-textMuted mt-0.5">Configure global alert parameters and thresholds for connected cameras</p></div>
            </div>
            <div className="flex flex-col gap-6 max-w-4xl">
              <div className="bg-soc-sidebar border border-soc-border rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h3 className="text-xs font-bold text-soc-textPrimary uppercase tracking-wider mb-1">Select Camera</h3><p className="text-[10px] text-soc-textMuted">Settings are loaded and applied on a per-camera basis</p></div>
                <div className="flex items-center gap-3 bg-soc-card border border-soc-border rounded-xl px-3 py-2 w-full md:w-80 shadow-inner">
                  <span className="material-symbols-outlined text-soc-textMuted text-sm">videocam</span>
                  <select value={settingsPageCameraId || ''} onChange={(e) => setSettingsPageCameraId(e.target.value)} className="bg-transparent text-xs text-soc-textPrimary focus:outline-none w-full cursor-pointer font-semibold">
                    <option value="" className="bg-soc-sidebar text-soc-textMuted">Choose a camera...</option>
                    {cameras.map((c) => (<option key={c.id} value={c.id} className="bg-soc-sidebar text-white">{c.name} ({c.location})</option>))}
                  </select>
                </div>
              </div>

              {settingsPageCameraId ? (
                <form onSubmit={handleSaveSettingsPage} className="flex flex-col gap-6">
                  {settingsPageError && (<div className="p-3.5 bg-soc-danger/10 border border-soc-danger/20 text-soc-danger text-xs rounded-xl shadow-md">{settingsPageError}</div>)}
                  {settingsPageSuccess && (<div className="p-3.5 bg-soc-success/10 border border-soc-success/20 text-soc-success text-xs rounded-xl shadow-md">{settingsPageSuccess}</div>)}
                  {settingsPageLoading && Object.keys(settingsPageValues).length === 0 ? (
                    <div className="text-center py-12 bg-soc-sidebar border border-soc-border rounded-2xl"><p className="text-soc-textMuted text-xs">Loading camera configurations...</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-soc-sidebar border border-soc-border rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-soc-border pb-3 mb-1">
                          <span className="material-symbols-outlined text-primary text-lg">shield</span>
                          <h4 className="text-xs font-bold text-soc-textPrimary uppercase tracking-wider">Intruder & Perimeter Detection</h4>
                        </div>
                        <div className="flex justify-between items-center bg-soc-card border border-soc-border rounded-xl p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-soc-textSecondary">Intrusion Alert Status</span>
                            <span className="text-[9px] text-soc-textMuted">Trigger warnings for perimeter breaches</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={!!settingsPageValues.intrusionEnabled} onChange={(e) => setSettingsPageValues({...settingsPageValues, intrusionEnabled: e.target.checked})} />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                        <div className="flex flex-col gap-3 bg-soc-card border border-soc-border rounded-xl p-3">
                          <span className="text-xs font-semibold text-soc-textSecondary mb-1">Restricted Hours (Detection Window)</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-soc-textMuted">Start Time</label>
                              <input type="time" step="1" className="bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono w-full shadow-inner" value={settingsPageValues.restrictedStartTime ? settingsPageValues.restrictedStartTime.substring(0, 8) : ''} onChange={(e) => setSettingsPageValues({...settingsPageValues, restrictedStartTime: e.target.value || null})} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-soc-textMuted">End Time</label>
                              <input type="time" step="1" className="bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono w-full shadow-inner" value={settingsPageValues.restrictedEndTime ? settingsPageValues.restrictedEndTime.substring(0, 8) : ''} onChange={(e) => setSettingsPageValues({...settingsPageValues, restrictedEndTime: e.target.value || null})} />
                            </div>
                          </div>
                          <span className="text-[9px] text-soc-textMuted leading-normal mt-1">Alerts will only trigger during this schedule. Leave empty to allow 24/7 detection.</span>
                        </div>
                        <div className="flex flex-col gap-1.5 bg-soc-card border border-soc-border rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-soc-textSecondary">Alert Cooldown Time</span>
                            <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">{settingsPageValues.cooldownSeconds || 60}s</span>
                          </div>
                          <input type="range" min="5" max="300" step="5" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary mt-1" value={settingsPageValues.cooldownSeconds !== undefined ? settingsPageValues.cooldownSeconds : 60} onChange={(e) => setSettingsPageValues({...settingsPageValues, cooldownSeconds: parseInt(e.target.value, 10)})} />
                          <span className="text-[9px] text-soc-textMuted">Minimum duration in seconds between subsequent incident alerts.</span>
                        </div>
                      </div>
                      <div className="bg-soc-sidebar border border-soc-border rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-soc-border pb-3 mb-1">
                          <span className="material-symbols-outlined text-primary text-lg">groups</span>
                          <h4 className="text-xs font-bold text-soc-textPrimary uppercase tracking-wider">Crowd & Analytics Criteria</h4>
                        </div>
                        <div className="flex justify-between items-center bg-soc-card border border-soc-border rounded-xl p-3">
                          <div className="flex flex-col gap-0.5"><span className="text-xs font-semibold text-soc-textSecondary">Crowd Alert Status</span><span className="text-[9px] text-soc-textMuted">Trigger warnings for density spikes</span></div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={!!settingsPageValues.crowdEnabled} onChange={(e) => setSettingsPageValues({...settingsPageValues, crowdEnabled: e.target.checked})} />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                        <div className="flex flex-col gap-1.5 bg-soc-card border border-soc-border rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1"><span className="text-xs font-semibold text-soc-textSecondary">Default Crowd Limit</span><span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">{settingsPageValues.crowdThreshold || 3} people</span></div>
                          <input type="range" min="2" max="50" step="1" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary mt-1" value={settingsPageValues.crowdThreshold !== undefined ? settingsPageValues.crowdThreshold : 3} onChange={(e) => setSettingsPageValues({...settingsPageValues, crowdThreshold: parseInt(e.target.value, 10)})} />
                          <span className="text-[9px] text-soc-textMuted">The minimum count of concurrent people detected required to flag as a crowd alert.</span>
                        </div>
                        <div className="flex flex-col gap-1.5 bg-soc-card border border-soc-border rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1"><span className="text-xs font-semibold text-soc-textSecondary">AI Model Confidence</span><span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">{Math.round((settingsPageValues.confidenceThreshold || 0.4) * 100)}%</span></div>
                          <input type="range" min="0.1" max="0.9" step="0.05" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary mt-1" value={settingsPageValues.confidenceThreshold !== undefined ? settingsPageValues.confidenceThreshold : 0.4} onChange={(e) => setSettingsPageValues({...settingsPageValues, confidenceThreshold: parseFloat(e.target.value)})} />
                          <span className="text-[9px] text-soc-textMuted">Confidence limit required by the object-detector to classify human figures.</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button type="submit" disabled={settingsPageLoading} className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-sm transition-colors shrink-0 cursor-pointer">{settingsPageLoading ? 'Saving changes...' : 'Save Settings'}</button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-12 bg-soc-sidebar border border-soc-border rounded-2xl"><p className="text-soc-textMuted text-xs">Please choose or register a camera to configure settings.</p></div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden p-6 gap-6 min-h-0 w-full">
            {activeTab === 'alerts' ? (
              <EdgeIncidents
                token={token}
                cameras={cameras}
                onLogout={onLogout}
                onSelectIncident={(inc) => setSelectedSnapshot(inc)}
              />
            ) : (
              <>
                <section className="bg-soc-sidebar border border-soc-border flex-1 rounded-2xl p-6 flex flex-col h-full overflow-hidden shadow-2xl">
                  <h3 className="text-sm font-bold text-soc-textPrimary uppercase tracking-wider mb-4 shrink-0">Registered Operators</h3>
                  <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                    {operators.length === 0 ? (
                      <p className="text-soc-textMuted text-xs">No operators registered.</p>
                    ) : (
                      <div className="w-full flex flex-col gap-2">
                        <div className="grid grid-cols-3 text-[10px] text-soc-textMuted font-bold uppercase tracking-wider pb-2 border-b border-soc-border px-4 shrink-0">
                          <span>Name</span><span>Email Address</span><span className="text-right">Action</span>
                        </div>
                        {operators.map((op) => (
                          <div key={op.id} className="grid grid-cols-3 items-center py-3 border-b border-soc-border hover:bg-white/5 transition-colors rounded-xl px-4 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">{op.name.charAt(0)}</div>
                              <span className="font-semibold text-soc-textPrimary">{op.name}</span>
                            </div>
                            <span className="text-soc-textMuted font-mono text-[11px] truncate">{op.email}</span>
                            <div className="text-right">
                              <button onClick={() => handleDeleteOperator(op.id, op.name)} className="px-3 py-1 bg-soc-danger/10 hover:bg-soc-danger/20 border border-soc-danger/20 text-soc-danger text-xs font-semibold rounded-xl transition-colors cursor-pointer">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
                <section className="bg-soc-sidebar border border-soc-border w-96 rounded-2xl p-6 flex flex-col h-fit shrink-0 shadow-2xl">
                  <h3 className="text-sm font-bold text-soc-textPrimary uppercase tracking-wider mb-4 shrink-0">Register Operator</h3>
                  <form onSubmit={handleAddOperator} className="flex flex-col gap-4">
                    {opError && (<div className="p-3 bg-soc-danger/10 border border-soc-danger/20 text-soc-danger text-xs rounded-xl">{opError}</div>)}
                    {opSuccess && (<div className="p-3 bg-soc-success/10 border border-soc-success/20 text-soc-success text-xs rounded-xl">{opSuccess}</div>)}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted">Full Name</label>
                      <input type="text" className="bg-soc-card border border-soc-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-sans" placeholder="Enter full name" value={newOpName} onChange={(e) => setNewOpName(e.target.value)} required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted">Email Address</label>
                      <input type="email" className="bg-soc-card border border-soc-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-sans" placeholder="operator@nirikshan.com" value={newOpEmail} onChange={(e) => setNewOpEmail(e.target.value)} required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted">Temporary Password</label>
                      <input type="password" className="bg-soc-card border border-soc-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-sans" placeholder="••••••••" value={newOpPassword} onChange={(e) => setNewOpPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-semibold text-xs shadow-sm mt-2 transition-colors cursor-pointer">Create Operator</button>
                  </form>
                </section>
              </>
            )}
          </div>
        )}

        {mode === 'edge' && isSettingsOpen && selectedCamera && (
          <aside className="fixed top-24 right-6 bottom-6 w-80 bg-soc-sidebar/95 backdrop-blur-md border border-soc-border rounded-2xl flex flex-col z-[150] shadow-2xl overflow-hidden animate-slide-in">
            <div className="p-4 border-b border-soc-border flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">settings</span>
                <h4 className="text-xs font-bold text-soc-textPrimary uppercase tracking-wider">AI Parameters</h4>
              </div>
              <button className="text-soc-textMuted hover:text-white text-lg font-bold cursor-pointer" onClick={() => setIsSettingsOpen(false)}>×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {settingsError && (<div className="p-3 bg-soc-danger/10 border border-soc-danger/20 text-soc-danger text-xs rounded-xl">{settingsError}</div>)}
              {settingsSuccess && (<div className="p-3 bg-soc-success/10 border border-soc-success/20 text-soc-success text-xs rounded-xl">{settingsSuccess}</div>)}
              {settingsLoading && configSchema.length === 0 ? (
                <p className="text-soc-textMuted text-xs">Loading settings...</p>
              ) : (
                Object.entries(configSchema.reduce((acc, entry) => {
                  const cat = entry.category || 'General';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(entry);
                  return acc;
                }, {})).map(([category, entries]) => (
                  <div key={category} className="flex flex-col gap-3">
                    <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider border-b border-soc-border pb-1">{category}</h5>
                    {entries.map(entry => (
                      <div key={entry.key} className="flex flex-col gap-1.5 bg-soc-card border border-soc-border rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-soc-textSecondary">{entry.label}</span>
                          {entry.type !== 'boolean' && entry.type !== 'time' && (<span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">{settingsValues[entry.key]}</span>)}
                        </div>
                        {entry.type === 'boolean' ? (
                          <label className="relative inline-flex items-center cursor-pointer mt-1">
                            <input type="checkbox" className="sr-only peer" checked={!!settingsValues[entry.key]} onChange={(e) => setSettingsValues({...settingsValues, [entry.key]: e.target.checked})} />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        ) : entry.type === 'integer' || entry.type === 'float' ? (
                          <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary mt-1.5" min={entry.min !== undefined ? entry.min : 0} max={entry.max !== undefined ? entry.max : 100} step={entry.step !== undefined ? entry.step : 1} value={settingsValues[entry.key] !== undefined ? settingsValues[entry.key] : entry.default} onChange={(e) => setSettingsValues({...settingsValues, [entry.key]: entry.type === 'integer' ? parseInt(e.target.value, 10) : parseFloat(e.target.value)})} />
                        ) : entry.type === 'time' ? (
                          <input type="time" step="1" className="bg-soc-bg border border-soc-border rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-primary mt-1 font-mono w-full" value={settingsValues[entry.key] ? settingsValues[entry.key].substring(0, 8) : ''} onChange={(e) => { const newVal = e.target.value || null; setSettingsValues(prev => { const next = {...prev, [entry.key]: newVal}; if (newVal === null) { next.restrictedStartTime = null; next.restrictedEndTime = null; } return next; }); }} />
                        ) : (
                          <input type="text" className="bg-soc-bg border border-soc-border rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-primary mt-1 font-mono w-full" value={settingsValues[entry.key] || ''} onChange={(e) => setSettingsValues({...settingsValues, [entry.key]: e.target.value})} />
                        )}
                        <span className="text-[10px] text-soc-textMuted leading-relaxed mt-0.5">{entry.description}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-soc-border shrink-0">
              <button className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-xl font-medium text-xs shadow-sm transition-colors cursor-pointer" onClick={handleSaveSettings} disabled={settingsLoading}>
                {settingsLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </aside>
        )}
      </div>

      {mode === 'edge' && (
        <AddCameraModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          token={token}
          onLogout={onLogout}
          onSuccess={fetchData}
        />
      )}

      {mode === 'edge' && (
        <ContextMenu
          contextMenu={contextMenu}
          onDrawPerimeter={handleContextDrawPerimeter}
          onDeleteCamera={handleDeleteCamera}
          onClose={() => setContextMenu(null)}
        />
      )}

      <SnapshotViewer
        incident={selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
      />

      <AlertsHistoryModal
        isOpen={isAlertsHistoryOpen}
        onClose={() => setIsAlertsHistoryOpen(false)}
        token={token}
        onLogout={onLogout}
        onSelectIncident={setSelectedSnapshot}
      />
    </div>
  );
}
