import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API, STREAM } from './config';
import LiveFeedCard from './components/LiveFeedCard';
import AddCameraModal from './components/AddCameraModal';
import SnapshotViewer from './components/SnapshotViewer';
import ContextMenu from './components/ContextMenu';
import AlertsHistoryModal from './components/AlertsHistoryModal';

export default function Dashboard({ token, user, onLogout }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({
    totalCameras: 0,
    activeCameras: 0,
    totalIncidents: 0,
  });
  const [activeTab, setActiveTab] = useState('surveillance');
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
    if (activeTab === 'settings' && settingsPageCameraId) {
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

  useEffect(() => {
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
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (settingsSuccessTimeoutRef.current) clearTimeout(settingsSuccessTimeoutRef.current);
    };
  }, [token, fetchData]);

  useEffect(() => {
    if (!selectedCamera || isDrawingPerimeter) return;
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
    <div className="h-screen w-screen overflow-hidden text-[#dae2fd] antialiased flex bg-[#060b13] relative font-sans select-none">
      <aside className="w-72 bg-[#090f19] border-r border-[#162235] flex flex-col p-6 shrink-0 h-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.15)] text-violet-400">
            <span className="material-symbols-outlined text-xl">visibility</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white uppercase font-sans">Nirikshan AI</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-sans">Command Console</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto flex-1 pr-1">
          <div className="flex flex-col gap-1">
            <button onClick={() => setActiveTab('surveillance')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${activeTab === 'surveillance' ? 'bg-violet-600/15 border border-violet-500/20 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}>
              <span className="material-symbols-outlined text-lg">dashboard</span><span>Dashboard</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-1">Monitoring</span>
            <button onClick={() => setActiveTab('surveillance')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${activeTab === 'surveillance' ? 'bg-violet-600/15 border border-violet-500/20 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}>
              <span className="material-symbols-outlined text-lg">videocam</span><span>Camera Registry</span>
            </button>
            <button onClick={() => setActiveTab('live_feeds')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${activeTab === 'live_feeds' ? 'bg-violet-600/15 border border-violet-500/20 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}>
              <span className="material-symbols-outlined text-lg">live_tv</span><span>Live Feeds</span>
            </button>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed text-left">
              <span className="material-symbols-outlined text-lg">video_library</span><span>Recordings</span>
            </button>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed text-left">
              <span className="material-symbols-outlined text-lg">analytics</span><span>Analytics</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-1">Alerts & Events</span>
            <button onClick={() => setActiveTab('surveillance')} className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/5 text-slate-400 text-left w-full">
              <div className="flex items-center gap-3"><span className="material-symbols-outlined text-lg">shield</span><span>Security Alerts</span></div>
              <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{incidents.filter(i => i.severity === 'CRITICAL').length || 8}</span>
            </button>
            <button onClick={() => setActiveTab('surveillance')} className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/5 text-slate-400 text-left w-full">
              <div className="flex items-center gap-3"><span className="material-symbols-outlined text-lg">groups</span><span>Crowd Alerts</span></div>
              <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{incidents.filter(i => i.type.includes('CROWD') || i.severity === 'WARNING').length || 12}</span>
            </button>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed text-left">
              <span className="material-symbols-outlined text-lg">description</span><span>System Logs</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-1">System</span>
            {user?.role === 'ADMIN' && (
              <button onClick={() => setActiveTab('operators')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${activeTab === 'operators' ? 'bg-violet-600/15 border border-violet-500/20 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}>
                <span className="material-symbols-outlined text-lg">manage_accounts</span><span>Operators</span>
              </button>
            )}
            {user?.role === 'ADMIN' && (
              <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${activeTab === 'settings' ? 'bg-violet-600/15 border border-violet-500/20 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}>
                <span className="material-symbols-outlined text-lg">settings</span><span>Settings</span>
              </button>
            )}
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed text-left">
              <span className="material-symbols-outlined text-lg">receipt_long</span><span>Audit Logs</span>
            </button>
          </div>

          <div className="flex flex-col gap-1 mt-2 min-h-0 overflow-hidden border-t border-white/5 pt-4">
            <div className="flex justify-between items-center px-4 mb-2 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cameras</span>
              <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold shrink-0">
                {cameras.filter(c => c.status === 'ACTIVE').length} / {cameras.length}
              </span>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto pr-1 max-h-[220px]">
              {cameras.length === 0 ? (
                <span className="text-slate-500 text-[10px] px-4 py-2">No cameras registered.</span>
              ) : (
                cameras.map((cam) => (
                  <button key={cam.id} onClick={() => { setActiveTab('surveillance'); setSelectedCamera(cam); }} onContextMenu={(e) => handleContextMenu(e, cam)} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left w-full border ${selectedCamera?.id === cam.id ? 'bg-violet-600/15 border-violet-500/35 text-white font-semibold shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'hover:bg-white/5 bg-transparent border-transparent text-slate-400'}`}>
                    <div className="flex items-center gap-2 truncate flex-1 mr-2">
                      <span className="material-symbols-outlined text-base shrink-0">{cam.rtspUrl.length === 1 ? 'videocam' : 'sensors'}</span>
                      <span className="truncate text-[11px] font-sans">{cam.name}</span>
                    </div>
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cam.status === 'ACTIVE' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-500'}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <nav className="bg-[#090f19] border-b border-[#162235] h-20 px-8 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-6 ml-4">
            <button className={`pb-1 text-sm font-semibold transition-all border-b-2 ${activeTab === 'surveillance' ? 'text-white border-violet-500' : 'text-slate-400 border-transparent hover:text-white'}`} onClick={() => setActiveTab('surveillance')}>Surveillance</button>
            {user?.role === 'ADMIN' && (
              <button className={`pb-1 text-sm font-semibold transition-all border-b-2 ${activeTab === 'operators' ? 'text-white border-violet-500' : 'text-slate-400 border-transparent hover:text-white'}`} onClick={() => setActiveTab('operators')}>Operators</button>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-white leading-tight">{user?.name || 'Super Admin'}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{user?.role || 'Administrator'}</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-[#1b2a47] bg-[#101a2e] flex items-center justify-center text-violet-400 text-lg font-bold">{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</div>
            </div>
            <div className="h-6 w-px bg-[#162235]"></div>
            <button onClick={onLogout} className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors py-2 px-3 hover:bg-white/5 border border-[#162235] rounded-xl">
              <span className="material-symbols-outlined text-base">logout</span><span>Sign Out</span>
            </button>
          </div>
        </nav>

        {activeTab === 'surveillance' || activeTab === 'live_feeds' || user?.role !== 'ADMIN' ? (
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
                  <div><h2 className="text-xl font-bold text-white tracking-tight">Camera Registry</h2><p className="text-xs text-slate-400 mt-0.5">Monitor and manage all connected cameras</p></div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setIsCameraDropdownOpen(!isCameraDropdownOpen); }} className="flex items-center gap-2 px-4 py-2 border border-[#162235] bg-[#0c1524] hover:bg-[#121c2e] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-sm">
                        <span className="material-symbols-outlined text-sm">videocam</span>
                        <span>{selectedCamera ? selectedCamera.name : 'Choose Camera'}</span>
                        <span className="material-symbols-outlined text-xs ml-1 select-none">{isCameraDropdownOpen ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {isCameraDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-[#0c1524] border border-[#162235] rounded-xl shadow-2xl z-50 py-1.5 flex flex-col min-w-[200px] font-sans" onClick={(e) => e.stopPropagation()}>
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 mb-1 select-none">Select Camera Source</div>
                          <div className="max-h-60 overflow-y-auto">
                            {cameras.length === 0 ? (
                              <div className="px-4 py-2.5 text-xs text-slate-500 select-none">No cameras registered.</div>
                            ) : (
                              cameras.map((cam) => (
                                <button key={cam.id} onClick={() => { setSelectedCamera(cam); setIsCameraDropdownOpen(false); }} className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left transition-colors ${selectedCamera?.id === cam.id ? 'bg-violet-600/10 text-violet-400 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                  <span className="truncate flex-1 mr-2">{cam.name}</span>
                                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cam.status === 'ACTIVE' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-500'}`} />
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {user?.role === 'ADMIN' && (
                      <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)]">
                        <span className="material-symbols-outlined text-sm">add</span><span>Add Camera</span>
                      </button>
                    )}
                  </div>
                </div>

                <div ref={playerRef} className="bg-[#090f19] border border-[#162235] rounded-2xl relative overflow-hidden flex flex-col aspect-video w-full shadow-2xl shrink-0">
                  {selectedCamera && (
                    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-white drop-shadow-md">{selectedCamera.name}</h3>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold text-[9px] flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span><span>LIVE</span>
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                          <span className="material-symbols-outlined text-[10px]">location_on</span>
                          <span>{selectedCamera.location}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {user?.role === 'ADMIN' && !isDrawingPerimeter && (
                          <button onClick={startDrawingMode} className="px-3 py-1.5 text-[10px] bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 rounded-xl transition-all flex items-center gap-1.5 font-semibold shadow-sm">
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
                        <div className="mt-3 text-center bg-[#090f19]/95 border border-[#162235] px-4 py-2 rounded-xl max-w-md shadow-2xl">
                          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-0.5">Perimeter Drawing Mode</p>
                          <p className="text-[10px] text-slate-300">Click to place points. Connect back to the green start node to close the loop.</p>
                        </div>
                      </div>
                    ) : selectedCamera ? (
                      <canvas ref={streamCanvasRef} className="w-full h-full object-cover" />
                    ) : null}

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-[#06060c]" style={{ display: (selectedCamera && !streamError) || isDrawingPerimeter ? 'none' : 'flex' }}>
                      <div className="w-14 h-14 rounded-full bg-[#0c1524] flex items-center justify-center mb-4 text-violet-400 shadow-lg border border-[#162235]">
                        <span className="material-symbols-outlined text-2xl">videocam_off</span>
                      </div>
                      <span className="text-slate-400 text-xs max-w-md px-6 leading-relaxed">
                        {streamError ? streamError : 'Select a camera card from the left sidebar to start monitoring'}
                      </span>
                      {selectedCamera && streamError && (
                        <button onClick={() => { setStreamError(''); setStreamTimestamp(Date.now()); }} className="mt-4 px-3 py-1.5 bg-[#101a2e] hover:bg-[#15233d] border border-[#1f2f4c] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                          <span className="material-symbols-outlined text-sm">refresh</span><span>Retry Connection</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedCamera && (
                    <div className="bg-[#0c1524] border-t border-[#162235] px-4 py-3 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span className="material-symbols-outlined text-sm">videocam</span><span>Webcam</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
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
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0c1524]/90 backdrop-blur-md px-4 py-2 border border-[#162235] rounded-xl flex items-center gap-3 z-30 shadow-2xl">
                      <button className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1" onClick={clearDrawing}>
                        <span className="material-symbols-outlined text-[12px]">delete</span><span>Clear</span>
                      </button>
                      <button className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-md shadow-violet-500/20" onClick={saveDrawing}>
                        <span className="material-symbols-outlined text-[12px]">save</span><span>Save Perimeter</span>
                      </button>
                      <button className="px-3 py-1 bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-semibold flex items-center gap-1" onClick={cancelDrawing}>
                        <span className="material-symbols-outlined text-[12px]">close</span><span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab !== 'live_feeds' && (
              <aside className="w-80 bg-[#090f19] border border-[#162235] rounded-2xl flex flex-col shrink-0 h-full overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#162235] flex justify-between items-center shrink-0">
                  <div><h2 className="text-xs font-bold text-white uppercase tracking-wider">Security Alerts</h2><p className="text-[10px] text-slate-500">Real-time feed</p></div>
                  <button onClick={() => setIsAlertsHistoryOpen(true)} className="text-slate-400 hover:text-white border border-[#162235] bg-[#0c1524] px-3 py-1 rounded-xl text-[10px] font-semibold transition-colors">View All</button>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto p-4 flex-1">
                  {incidents.length === 0 ? (
                    <p className="text-slate-500 text-xs p-2">No alerts logged.</p>
                  ) : (
                    incidents.map((incident) => {
                      const isCritical = incident.severity === 'CRITICAL';
                      const isWarning = incident.severity === 'WARNING' || incident.severity === 'HIGH' || incident.type.includes('CROWD');
                      let borderClass = 'border-l-cyan-500';
                      let titleClass = 'text-cyan-400';
                      let bgOverlayClass = '';
                      if (isCritical) { borderClass = 'border-l-rose-500'; titleClass = 'text-rose-400'; bgOverlayClass = 'bg-rose-500/5 group-hover:bg-rose-500/10'; }
                      else if (isWarning) { borderClass = 'border-l-amber-500'; titleClass = 'text-amber-400'; bgOverlayClass = 'bg-amber-500/5 group-hover:bg-amber-500/10'; }
                      return (
                        <div key={incident.id} onClick={() => setSelectedSnapshot(incident)} className={`bg-[#0d1624] border border-[#162235] p-3 rounded-xl border-l-4 relative overflow-hidden group flex-shrink-0 h-auto cursor-pointer hover:border-slate-600 transition-all ${borderClass}`}>
                          {bgOverlayClass && <div className={`absolute inset-0 transition-colors pointer-events-none ${bgOverlayClass}`} />}
                          <div className="relative z-10 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-bold tracking-wide uppercase ${titleClass}`}>{incident.type}</span>
                              <span className="text-[9px] text-slate-500 font-mono">{new Date(incident.timestamp || incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-normal">{incident.description}</p>
                            <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1 font-sans">
                              <span className="material-symbols-outlined text-[10px]">location_on</span>
                              <span>{incident.camera ? incident.camera.location : incident.location || 'Surveillance Area'}</span>
                            </div>
                            {incident.imageUrl && (
                              <div className="mt-2 relative rounded-lg overflow-hidden border border-white/5 aspect-video bg-black/50 group/thumb">
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
                <div className="p-3 border-t border-[#162235] bg-[#0c1524] shrink-0">
                  <button onClick={() => setIsAlertsHistoryOpen(true)} className="w-full bg-[#121c2e] hover:bg-[#1a2942] text-slate-300 hover:text-white border border-[#1f2f4c] rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all">
                    <span>View All Alerts</span><span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              </aside>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="flex-1 flex flex-col p-6 gap-6 min-h-0 w-full overflow-y-auto pr-1">
            <div className="flex justify-between items-center shrink-0">
              <div><h2 className="text-xl font-bold text-white tracking-tight">System Settings</h2><p className="text-xs text-slate-400 mt-0.5">Configure global alert parameters and thresholds for connected cameras</p></div>
            </div>
            <div className="flex flex-col gap-6 max-w-4xl">
              <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Select Camera</h3><p className="text-[10px] text-slate-500">Settings are loaded and applied on a per-camera basis</p></div>
                <div className="flex items-center gap-3 bg-[#0d1625] border border-[#1b2a47] rounded-xl px-3 py-2 w-full md:w-80 shadow-inner">
                  <span className="material-symbols-outlined text-slate-400 text-sm">videocam</span>
                  <select value={settingsPageCameraId || ''} onChange={(e) => setSettingsPageCameraId(e.target.value)} className="bg-transparent text-xs text-white focus:outline-none w-full cursor-pointer font-semibold">
                    <option value="" className="bg-[#090f19] text-slate-400">Choose a camera...</option>
                    {cameras.map((c) => (<option key={c.id} value={c.id} className="bg-[#090f19] text-white">{c.name} ({c.location})</option>))}
                  </select>
                </div>
              </div>

              {settingsPageCameraId ? (
                <form onSubmit={handleSaveSettingsPage} className="flex flex-col gap-6">
                  {settingsPageError && (<div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl shadow-md">{settingsPageError}</div>)}
                  {settingsPageSuccess && (<div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl shadow-md">{settingsPageSuccess}</div>)}
                  {settingsPageLoading && Object.keys(settingsPageValues).length === 0 ? (
                    <div className="text-center py-12 bg-[#090f19] border border-[#162235] rounded-2xl"><p className="text-slate-400 text-xs">Loading camera configurations...</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-[#162235] pb-3 mb-1">
                          <span className="material-symbols-outlined text-violet-400 text-lg">shield</span>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Intruder & Perimeter Detection</h4>
                        </div>
                        <div className="flex justify-between items-center bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-300">Intrusion Alert Status</span>
                            <span className="text-[9px] text-slate-500">Trigger warnings for perimeter breaches</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={!!settingsPageValues.intrusionEnabled} onChange={(e) => setSettingsPageValues({...settingsPageValues, intrusionEnabled: e.target.checked})} />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                          </label>
                        </div>
                        <div className="flex flex-col gap-3 bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <span className="text-xs font-semibold text-slate-300 mb-1">Restricted Hours (Detection Window)</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Start Time</label>
                              <input type="time" step="1" className="bg-[#0a111c] border border-[#1b2b47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono w-full shadow-inner" value={settingsPageValues.restrictedStartTime ? settingsPageValues.restrictedStartTime.substring(0, 8) : ''} onChange={(e) => setSettingsPageValues({...settingsPageValues, restrictedStartTime: e.target.value || null})} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">End Time</label>
                              <input type="time" step="1" className="bg-[#0a111c] border border-[#1b2b47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono w-full shadow-inner" value={settingsPageValues.restrictedEndTime ? settingsPageValues.restrictedEndTime.substring(0, 8) : ''} onChange={(e) => setSettingsPageValues({...settingsPageValues, restrictedEndTime: e.target.value || null})} />
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-500 leading-normal mt-1">Alerts will only trigger during this schedule. Leave empty to allow 24/7 detection.</span>
                        </div>
                        <div className="flex flex-col gap-1.5 bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-slate-300">Alert Cooldown Time</span>
                            <span className="bg-violet-600/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">{settingsPageValues.cooldownSeconds || 60}s</span>
                          </div>
                          <input type="range" min="5" max="300" step="5" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 mt-1" value={settingsPageValues.cooldownSeconds !== undefined ? settingsPageValues.cooldownSeconds : 60} onChange={(e) => setSettingsPageValues({...settingsPageValues, cooldownSeconds: parseInt(e.target.value, 10)})} />
                          <span className="text-[9px] text-slate-500">Minimum duration in seconds between subsequent incident alerts.</span>
                        </div>
                      </div>
                      <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-[#162235] pb-3 mb-1">
                          <span className="material-symbols-outlined text-violet-400 text-lg">groups</span>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Crowd & Analytics Criteria</h4>
                        </div>
                        <div className="flex justify-between items-center bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <div className="flex flex-col gap-0.5"><span className="text-xs font-semibold text-slate-300">Crowd Alert Status</span><span className="text-[9px] text-slate-500">Trigger warnings for density spikes</span></div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={!!settingsPageValues.crowdEnabled} onChange={(e) => setSettingsPageValues({...settingsPageValues, crowdEnabled: e.target.checked})} />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                          </label>
                        </div>
                        <div className="flex flex-col gap-1.5 bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1"><span className="text-xs font-semibold text-slate-300">Default Crowd Limit</span><span className="bg-violet-600/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">{settingsPageValues.crowdThreshold || 3} people</span></div>
                          <input type="range" min="2" max="50" step="1" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 mt-1" value={settingsPageValues.crowdThreshold !== undefined ? settingsPageValues.crowdThreshold : 3} onChange={(e) => setSettingsPageValues({...settingsPageValues, crowdThreshold: parseInt(e.target.value, 10)})} />
                          <span className="text-[9px] text-slate-500">The minimum count of concurrent people detected required to flag as a crowd alert.</span>
                        </div>
                        <div className="flex flex-col gap-1.5 bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1"><span className="text-xs font-semibold text-slate-300">AI Model Confidence</span><span className="bg-violet-600/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">{Math.round((settingsPageValues.confidenceThreshold || 0.4) * 100)}%</span></div>
                          <input type="range" min="0.1" max="0.9" step="0.05" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 mt-1" value={settingsPageValues.confidenceThreshold !== undefined ? settingsPageValues.confidenceThreshold : 0.4} onChange={(e) => setSettingsPageValues({...settingsPageValues, confidenceThreshold: parseFloat(e.target.value)})} />
                          <span className="text-[9px] text-slate-500">Confidence limit required by the object-detector to classify human figures.</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button type="submit" disabled={settingsPageLoading} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition-colors shrink-0">{settingsPageLoading ? 'Saving changes...' : 'Save Settings'}</button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-12 bg-[#090f19] border border-[#162235] rounded-2xl"><p className="text-slate-400 text-xs">Please choose or register a camera to configure settings.</p></div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden p-6 gap-6 min-h-0 w-full">
            <section className="bg-[#090f19] border border-[#162235] flex-1 rounded-2xl p-6 flex flex-col h-full overflow-hidden shadow-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 shrink-0">Registered Operators</h3>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                {operators.length === 0 ? (
                  <p className="text-slate-500 text-xs">No operators registered.</p>
                ) : (
                  <div className="w-full flex flex-col gap-2">
                    <div className="grid grid-cols-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-2 border-b border-[#162235] px-4 shrink-0">
                      <span>Name</span><span>Email Address</span><span className="text-right">Action</span>
                    </div>
                    {operators.map((op) => (
                      <div key={op.id} className="grid grid-cols-3 items-center py-3 border-b border-[#162235] hover:bg-white/5 transition-colors rounded-xl px-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs uppercase">{op.name.charAt(0)}</div>
                          <span className="font-semibold text-white">{op.name}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px] truncate">{op.email}</span>
                        <div className="text-right">
                          <button onClick={() => handleDeleteOperator(op.id, op.name)} className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl transition-colors">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            <section className="bg-[#090f19] border border-[#162235] w-96 rounded-2xl p-6 flex flex-col h-fit shrink-0 shadow-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 shrink-0">Register Operator</h3>
              <form onSubmit={handleAddOperator} className="flex flex-col gap-4">
                {opError && (<div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{opError}</div>)}
                {opSuccess && (<div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{opSuccess}</div>)}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                  <input type="text" className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans" placeholder="Enter full name" value={newOpName} onChange={(e) => setNewOpName(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                  <input type="email" className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans" placeholder="operator@nirikshan.com" value={newOpEmail} onChange={(e) => setNewOpEmail(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Temporary Password</label>
                  <input type="password" className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans" placeholder="••••••••" value={newOpPassword} onChange={(e) => setNewOpPassword(e.target.value)} required />
                </div>
                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl font-semibold text-xs shadow-[0_0_15px_rgba(124,58,237,0.2)] mt-2 transition-colors">Create Operator</button>
              </form>
            </section>
          </div>
        )}

        {isSettingsOpen && selectedCamera && (
          <aside className="fixed top-24 right-6 bottom-6 w-80 bg-[#090f19]/95 backdrop-blur-md border border-[#162235] rounded-2xl flex flex-col z-[150] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#162235] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-violet-400 text-sm">settings</span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Parameters</h4>
              </div>
              <button className="text-slate-400 hover:text-white text-lg font-bold" onClick={() => setIsSettingsOpen(false)}>×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {settingsError && (<div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{settingsError}</div>)}
              {settingsSuccess && (<div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{settingsSuccess}</div>)}
              {settingsLoading && configSchema.length === 0 ? (
                <p className="text-slate-400 text-xs">Loading settings...</p>
              ) : (
                Object.entries(configSchema.reduce((acc, entry) => {
                  const cat = entry.category || 'General';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(entry);
                  return acc;
                }, {})).map(([category, entries]) => (
                  <div key={category} className="flex flex-col gap-3">
                    <h5 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider border-b border-[#162235] pb-1">{category}</h5>
                    {entries.map(entry => (
                      <div key={entry.key} className="flex flex-col gap-1.5 bg-[#0e1624] border border-[#17253d] rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-300">{entry.label}</span>
                          {entry.type !== 'boolean' && entry.type !== 'time' && (<span className="bg-violet-600/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">{settingsValues[entry.key]}</span>)}
                        </div>
                        {entry.type === 'boolean' ? (
                          <label className="relative inline-flex items-center cursor-pointer mt-1">
                            <input type="checkbox" className="sr-only peer" checked={!!settingsValues[entry.key]} onChange={(e) => setSettingsValues({...settingsValues, [entry.key]: e.target.checked})} />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                          </label>
                        ) : entry.type === 'integer' || entry.type === 'float' ? (
                          <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 mt-1.5" min={entry.min !== undefined ? entry.min : 0} max={entry.max !== undefined ? entry.max : 100} step={entry.step !== undefined ? entry.step : 1} value={settingsValues[entry.key] !== undefined ? settingsValues[entry.key] : entry.default} onChange={(e) => setSettingsValues({...settingsValues, [entry.key]: entry.type === 'integer' ? parseInt(e.target.value, 10) : parseFloat(e.target.value)})} />
                        ) : entry.type === 'time' ? (
                          <input type="time" step="1" className="bg-[#0a111c] border border-[#1b2b47] rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 mt-1 font-mono w-full" value={settingsValues[entry.key] ? settingsValues[entry.key].substring(0, 8) : ''} onChange={(e) => { const newVal = e.target.value || null; setSettingsValues(prev => { const next = {...prev, [entry.key]: newVal}; if (newVal === null) { next.restrictedStartTime = null; next.restrictedEndTime = null; } return next; }); }} />
                        ) : (
                          <input type="text" className="bg-[#0a111c] border border-[#1b2b47] rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 mt-1 font-mono w-full" value={settingsValues[entry.key] || ''} onChange={(e) => setSettingsValues({...settingsValues, [entry.key]: e.target.value})} />
                        )}
                        <span className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{entry.description}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-[#162235] shrink-0">
              <button className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-xl font-medium text-xs shadow-[0_0_15px_rgba(124,58,237,0.2)] transition-colors" onClick={handleSaveSettings} disabled={settingsLoading}>
                {settingsLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </aside>
        )}
      </div>

      <AddCameraModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        token={token}
        onLogout={onLogout}
        onSuccess={fetchData}
      />

      <ContextMenu
        contextMenu={contextMenu}
        onDrawPerimeter={handleContextDrawPerimeter}
        onDeleteCamera={handleDeleteCamera}
        onClose={() => setContextMenu(null)}
      />

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
