import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API, STREAM } from './config';


function LiveFeedCard({ cam, onClick, onDelete }) {
  const [isOffline, setIsOffline] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const streamUrl = `${STREAM.VIDEO_FEED}?camera_id=${cam.id}&retry=${retryKey}`;

  useEffect(() => {
    if (!isOffline) return;
    // Auto-retry checking the feed every 15 seconds
    const interval = setInterval(() => {
      setRetryKey((prev) => prev + 1);
      setIsOffline(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [isOffline]);

  const handleRetry = (e) => {
    e.stopPropagation();
    setRetryKey((prev) => prev + 1);
    setIsOffline(false);
  };

  return (
    <div
      className="bg-[#090f19] border border-[#162235] rounded-2xl overflow-hidden flex flex-col shadow-xl group hover:border-violet-500/40 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Feed Player Screen */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        <img
          src={streamUrl}
          crossOrigin="anonymous"
          alt={cam.name}
          className={`w-full h-full object-cover ${isOffline ? 'hidden' : ''}`}
          onError={() => setIsOffline(true)}
          onLoad={() => setIsOffline(false)}
        />
        
        {isOffline && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900/50 text-slate-500 text-[10px] text-center z-10">
            <span className="material-symbols-outlined text-lg mb-1 text-slate-600">videocam_off</span>
            <span className="font-semibold text-slate-400 mb-2">Feed Offline</span>
            <button
              onClick={handleRetry}
              className="px-2.5 py-1 bg-[#101a2e] hover:bg-[#15233d] border border-[#1f2f4c] text-slate-300 hover:text-white rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider flex items-center gap-1 shadow-md"
            >
              <span className="material-symbols-outlined text-[10px]">refresh</span>
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Header overlay */}
        <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start bg-gradient-to-b from-black/85 to-transparent z-10">
          <div>
            <h3 className="text-xs font-semibold text-white drop-shadow">{cam.name}</h3>
            <p className="text-[9px] text-slate-300 drop-shadow mt-0.5">{cam.location}</p>
          </div>
          <span className={`${isOffline ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} border px-1.5 py-0.5 rounded-full font-bold text-[8px] flex items-center gap-1 shadow-sm`}>
            <span className={`w-1 h-1 ${isOffline ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'} rounded-full`}></span>
            <span>{isOffline ? 'OFFLINE' : 'LIVE'}</span>
          </span>
        </div>
      </div>

      {/* Footer info bar */}
      <div className="bg-[#0c1524] px-4 py-2 border-t border-[#162235]/40 flex justify-between items-center text-[10px] text-slate-400">
        <span className="font-semibold text-slate-300">
          {cam.rtspUrl.length === 1 ? 'Webcam Feed' : 'Network Stream'}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 hover:text-rose-300 transition-all text-[9px] font-semibold uppercase tracking-wider"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(e, cam.id, cam.name);
            }}
            title={`Delete ${cam.name}`}
          >
            <span className="material-symbols-outlined text-[12px]">delete</span>
            <span>Delete</span>
          </button>
          <span className="text-slate-500 hover:text-white transition-colors text-[9px] uppercase tracking-wider font-bold">
            Click to expand
          </span>
        </div>
      </div>
    </div>
  );
}


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
  const [isCameraDropdownOpen, setIsCameraDropdownOpen] = useState(false);
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
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  // Historical Alerts Log States
  const [isAlertsHistoryOpen, setIsAlertsHistoryOpen] = useState(false);
  const [historyIncidents, setHistoryIncidents] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalRecords, setHistoryTotalRecords] = useState(0);
  const [historyLimit] = useState(10);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Settings Page States
  const [settingsPageCameraId, setSettingsPageCameraId] = useState('');
  const [settingsPageSchema, setSettingsPageSchema] = useState([]);
  const [settingsPageValues, setSettingsPageValues] = useState({});
  const [settingsPageLoading, setSettingsPageLoading] = useState(false);
  const [settingsPageError, setSettingsPageError] = useState('');
  const [settingsPageSuccess, setSettingsPageSuccess] = useState('');
  
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const frozenFrameRef = useRef(null);
  const settingsSuccessTimeoutRef = useRef(null);
  const playerRef = useRef(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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
      setIsCameraDropdownOpen(false);
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Listen to fullscreen changes to update toggle icon state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

  // Auto-select first camera for Settings Page
  useEffect(() => {
    if (cameras.length > 0 && !settingsPageCameraId) {
      setSettingsPageCameraId(cameras[0].id);
    }
  }, [cameras, settingsPageCameraId]);

  // Fetch Settings Page Config Schema
  useEffect(() => {
    if (activeTab === 'settings' && settingsPageCameraId) {
      const fetchSettingsPageConfig = async () => {
        setSettingsPageLoading(true);
        setSettingsPageError('');
        setSettingsPageSuccess('');
        try {
          const res = await fetch(`${API.CAMERAS}/${settingsPageCameraId}/config-schema`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.status === 401) {
            onLogout();
            return;
          }
          if (res.ok) {
            const schemaData = await res.json();
            setSettingsPageSchema(schemaData);
            const vals = {};
            schemaData.forEach(entry => {
              vals[entry.key] = entry.value !== undefined ? entry.value : entry.default;
            });
            setSettingsPageValues(vals);
          } else {
            const data = await res.json();
            setSettingsPageError(data.error || 'Failed to load camera settings.');
          }
        } catch (err) {
          setSettingsPageError('Connection error. Failed to load camera settings.');
          console.error("Error fetching settings page schema:", err);
        } finally {
          setSettingsPageLoading(false);
        }
      };
      fetchSettingsPageConfig();
    }
  }, [activeTab, settingsPageCameraId, token, onLogout]);

  // Save Settings Page Config
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

      setSettingsPageSuccess('Settings saved successfully!');
      
      const updatedCam = data.camera;
      if (selectedCamera?.id === updatedCam.id) {
        setSelectedCamera(updatedCam);
      }
      setCameras(cameras.map(c => c.id === updatedCam.id ? updatedCam : c));
    } catch (err) {
      setSettingsPageError(err.message);
    } finally {
      setSettingsPageLoading(false);
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

  // Fetch all historical incidents from DB with pagination
  const fetchAlertsHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch(`${API.INCIDENTS}?page=${page}&limit=${historyLimit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        const result = await res.json();
        setHistoryIncidents(result.data || []);
        setHistoryPage(result.pagination.currentPage);
        setHistoryTotalPages(result.pagination.totalPages);
        setHistoryTotalRecords(result.pagination.totalRecords);
      } else {
        const data = await res.json();
        setHistoryError(data.error || 'Failed to load historical alerts.');
      }
    } catch (err) {
      setHistoryError('Connection error. Failed to load alerts.');
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, onLogout, historyLimit]);

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

  // Toggle fullscreen mode on stream player element
  const handleFullscreen = () => {
    if (!playerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      playerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden text-[#dae2fd] antialiased flex bg-[#060b13] relative font-sans select-none">
      {/* Left Sidebar */}
      <aside className="w-72 bg-[#090f19] border-r border-[#162235] flex flex-col p-6 shrink-0 h-full">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.15)] text-violet-400">
            <span className="material-symbols-outlined text-xl">visibility</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white uppercase font-sans">Nirikshan AI</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-sans">Command Console</p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex flex-col gap-6 overflow-y-auto flex-1 pr-1">
          {/* Main Links */}
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('surveillance')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === 'surveillance'
                  ? 'bg-violet-600/15 border border-violet-500/20 text-white shadow-sm'
                  : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              <span>Dashboard</span>
            </button>
          </div>

          {/* MONITORING Section */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-1">Monitoring</span>
            <button 
              onClick={() => setActiveTab('surveillance')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === 'surveillance'
                  ? 'bg-violet-600/15 border border-violet-500/20 text-white shadow-sm'
                  : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-lg">videocam</span>
              <span>Camera Registry</span>
            </button>
            <button 
              onClick={() => setActiveTab('live_feeds')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === 'live_feeds'
                  ? 'bg-violet-600/15 border border-violet-500/20 text-white shadow-sm'
                  : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-lg">live_tv</span>
              <span>Live Feeds</span>
            </button>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed text-left">
              <span className="material-symbols-outlined text-lg">video_library</span>
              <span>Recordings</span>
            </button>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed text-left">
              <span className="material-symbols-outlined text-lg">analytics</span>
              <span>Analytics</span>
            </button>
          </div>

          {/* ALERTS Section */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-1">Alerts & Events</span>
            <button 
              onClick={() => setActiveTab('surveillance')}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/5 text-slate-400 text-left w-full"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">shield</span>
                <span>Security Alerts</span>
              </div>
              <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {incidents.filter(i => i.severity === 'CRITICAL').length || 8}
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('surveillance')}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/5 text-slate-400 text-left w-full"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">groups</span>
                <span>Crowd Alerts</span>
              </div>
              <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {incidents.filter(i => i.type.includes('CROWD') || i.severity === 'WARNING').length || 12}
              </span>
            </button>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed text-left">
              <span className="material-symbols-outlined text-lg">description</span>
              <span>System Logs</span>
            </button>
          </div>

          {/* SYSTEM Section */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-1">System</span>
            {user?.role === 'ADMIN' && (
              <button 
                onClick={() => setActiveTab('operators')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                  activeTab === 'operators'
                    ? 'bg-violet-600/15 border border-violet-500/20 text-white shadow-sm'
                    : 'hover:bg-white/5 text-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-lg">manage_accounts</span>
                <span>Operators</span>
              </button>
            )}
            {user?.role === 'ADMIN' && (
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                  activeTab === 'settings'
                    ? 'bg-violet-600/15 border border-violet-500/20 text-white shadow-sm'
                    : 'hover:bg-white/5 text-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-lg">settings</span>
                <span>Settings</span>
              </button>
            )}
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed text-left">
              <span className="material-symbols-outlined text-lg">receipt_long</span>
              <span>Audit Logs</span>
            </button>
          </div>

          {/* CAMERAS Section */}
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
                  <button
                    key={cam.id}
                    onClick={() => {
                      setActiveTab('surveillance');
                      setSelectedCamera(cam);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, cam)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left w-full border ${
                      selectedCamera?.id === cam.id
                        ? 'bg-violet-600/15 border-violet-500/35 text-white font-semibold shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                        : 'hover:bg-white/5 bg-transparent border-transparent text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 mr-2">
                      <span className="material-symbols-outlined text-base shrink-0">
                        {cam.rtspUrl.length === 1 ? 'videocam' : 'sensors'}
                      </span>
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

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Navigation */}
        <nav className="bg-[#090f19] border-b border-[#162235] h-20 px-8 flex justify-between items-center z-10 shrink-0">
          {/* Centered Tab Buttons */}
          <div className="flex items-center gap-6 ml-4">
            <button
              className={`pb-1 text-sm font-semibold transition-all border-b-2 ${
                activeTab === 'surveillance'
                  ? 'text-white border-violet-500'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
              onClick={() => setActiveTab('surveillance')}
            >
              Surveillance
            </button>
            {user?.role === 'ADMIN' && (
              <button
                className={`pb-1 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === 'operators'
                    ? 'text-white border-violet-500'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
                onClick={() => setActiveTab('operators')}
              >
                Operators
              </button>
            )}
          </div>

          {/* User profile / Actions */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-white leading-tight">{user?.name || 'Super Admin'}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{user?.role || 'Administrator'}</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-[#1b2a47] bg-[#101a2e] flex items-center justify-center text-violet-400 text-lg font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
            </div>

            <div className="h-6 w-px bg-[#162235]"></div>

            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors py-2 px-3 hover:bg-white/5 border border-[#162235] rounded-xl"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </nav>

        {activeTab === 'surveillance' || activeTab === 'live_feeds' || user?.role !== 'ADMIN' ? (
          <div className="flex-1 flex overflow-hidden p-6 gap-6 min-h-0 w-full">
            {activeTab === 'live_feeds' ? (
              /* Center Content Workspace: Live Feeds Grid */
              <div className="flex-1 h-full min-h-0 flex flex-col gap-6 overflow-y-auto pr-1">
                {/* Workspace Header */}
                <div className="flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Live Feeds</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Simultaneous multi-camera grid monitor</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-[#0c1524] border border-[#162235] px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Grid Mode: {cameras.length <= 1 ? '1x1' : cameras.length <= 4 ? '2x2' : '3x3'}
                    </span>
                  </div>
                </div>

                {/* Grid of cameras */}
                <div className="flex-1 min-h-0">
                  {cameras.length === 0 ? (
                    <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-8 text-center text-slate-500 text-xs">
                      No cameras registered to show live feeds.
                    </div>
                  ) : (
                    <div className={`grid gap-4 ${
                      cameras.length === 1 
                        ? 'grid-cols-1' 
                        : 'grid-cols-1 md:grid-cols-2'
                    }`}>
                      {cameras.map((cam) => (
                        <LiveFeedCard
                          key={cam.id}
                          cam={cam}
                          onDelete={handleDeleteCamera}
                          onClick={() => {
                            setSelectedCamera(cam);
                            setActiveTab('surveillance');
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Center Content Workspace: Camera registry title and feeds */
              <div className="flex-1 h-full min-h-0 flex flex-col gap-6 overflow-y-auto pr-1">
              {/* Workspace Header */}
              <div className="flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Camera Registry</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Monitor and manage all connected cameras</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Choose Camera Dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCameraDropdownOpen(!isCameraDropdownOpen);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-[#162235] bg-[#0c1524] hover:bg-[#121c2e] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">videocam</span>
                      <span>{selectedCamera ? selectedCamera.name : 'Choose Camera'}</span>
                      <span className="material-symbols-outlined text-xs ml-1 select-none">
                        {isCameraDropdownOpen ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    
                    {isCameraDropdownOpen && (
                      <div 
                        className="absolute right-0 mt-2 w-56 bg-[#0c1524] border border-[#162235] rounded-xl shadow-2xl z-50 py-1.5 flex flex-col min-w-[200px] font-sans"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 mb-1 select-none">
                          Select Camera Source
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {cameras.length === 0 ? (
                            <div className="px-4 py-2.5 text-xs text-slate-500 select-none">
                              No cameras registered.
                            </div>
                          ) : (
                            cameras.map((cam) => (
                              <button
                                key={cam.id}
                                onClick={() => {
                                  setSelectedCamera(cam);
                                  setIsCameraDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left transition-colors ${
                                  selectedCamera?.id === cam.id
                                    ? 'bg-violet-600/10 text-violet-400 font-bold'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className="truncate flex-1 mr-2">{cam.name}</span>
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                  cam.status === 'ACTIVE' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-500'
                                }`} />
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>Add Camera</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Stream Player Card */}
              <div ref={playerRef} className="bg-[#090f19] border border-[#162235] rounded-2xl relative overflow-hidden flex flex-col aspect-video w-full shadow-2xl shrink-0">
                {/* Header overlay */}
                {selectedCamera && (
                  <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-white drop-shadow-md">{selectedCamera.name}</h3>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold text-[9px] flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                          <span>LIVE</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                        <span className="material-symbols-outlined text-[10px]">location_on</span>
                        <span>{selectedCamera.location}</span>
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {user?.role === 'ADMIN' && !isDrawingPerimeter && (
                        <>
                          <button
                            onClick={startDrawingMode}
                            className="px-3 py-1.5 text-[10px] bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 rounded-xl transition-all flex items-center gap-1.5 font-semibold shadow-sm"
                          >
                            <span className="material-symbols-outlined text-sm">polyline</span>
                            <span>Virtual Perimeter</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Video Player */}
                <div className="flex-1 relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                  {isDrawingPerimeter ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/60 z-20">
                      <canvas
                        ref={canvasRef}
                        className="max-h-[80%] max-w-full rounded-lg border border-white/10 shadow-2xl bg-slate-950"
                        onClick={handleCanvasClick}
                        onMouseMove={handleCanvasMouseMove}
                        style={{ cursor: 'crosshair' }}
                      />
                      <div className="mt-3 text-center bg-[#090f19]/95 border border-[#162235] px-4 py-2 rounded-xl max-w-md shadow-2xl">
                        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-0.5">Perimeter Drawing Mode</p>
                        <p className="text-[10px] text-slate-300">Click to place points. Connect back to the green start node to close the loop.</p>
                      </div>
                    </div>
                  ) : selectedCamera ? (
                    <img
                      ref={imgRef}
                      crossOrigin="anonymous"
                      src={`${STREAM.VIDEO_FEED}?camera_id=${selectedCamera.id}&t=${streamTimestamp}`}
                      alt="Surveillance Feed"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        setStreamError('Stream unavailable. Check if the AI service is running.');
                      }}
                      onLoad={() => setStreamError('')}
                    />
                  ) : null}

                  {/* Offline State / Placeholder */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-[#06060c]"
                    style={{ display: (selectedCamera && !streamError) || isDrawingPerimeter ? 'none' : 'flex' }}
                  >
                    <div className="w-14 h-14 rounded-full bg-[#0c1524] flex items-center justify-center mb-4 text-violet-400 shadow-lg border border-[#162235]">
                      <span className="material-symbols-outlined text-2xl">videocam_off</span>
                    </div>
                    <span className="text-slate-400 text-xs max-w-md px-6 leading-relaxed">
                      {streamError
                        ? streamError
                        : 'Select a camera card from the left sidebar to start monitoring'}
                    </span>
                    {selectedCamera && streamError && (
                      <button
                        onClick={() => {
                          setStreamError('');
                          setStreamTimestamp(Date.now());
                        }}
                        className="mt-4 px-3 py-1.5 bg-[#101a2e] hover:bg-[#15233d] border border-[#1f2f4c] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5 shadow-md"
                      >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        <span>Retry Connection</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Control bar */}
                {selectedCamera && (
                  <div className="bg-[#0c1524] border-t border-[#162235] px-4 py-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <span className="material-symbols-outlined text-sm">videocam</span>
                        <span>Webcam</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button onClick={handleFullscreen} className="hover:text-white transition-colors flex items-center justify-center" title="Toggle Fullscreen">
                        <span className="material-symbols-outlined text-base">
                          {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                        </span>
                      </button>
                      <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="hover:text-white transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined text-base">settings</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Floating canvas action buttons inside player area when drawing */}
                {isDrawingPerimeter && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0c1524]/90 backdrop-blur-md px-4 py-2 border border-[#162235] rounded-xl flex items-center gap-3 z-30 shadow-2xl">
                    <button className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1" onClick={clearDrawing}>
                      <span className="material-symbols-outlined text-[12px]">delete</span>
                      <span>Clear</span>
                    </button>
                    <button className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-md shadow-violet-500/20" onClick={saveDrawing}>
                      <span className="material-symbols-outlined text-[12px]">save</span>
                      <span>Save Perimeter</span>
                    </button>
                    <button className="px-3 py-1 bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-semibold flex items-center gap-1" onClick={cancelDrawing}>
                      <span className="material-symbols-outlined text-[12px]">close</span>
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

            {/* Right Sidebar: Security Alerts (Real-time feed) */}
            {activeTab !== 'live_feeds' && (
              <aside className="w-80 bg-[#090f19] border border-[#162235] rounded-2xl flex flex-col shrink-0 h-full overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#162235] flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Security Alerts</h2>
                    <p className="text-[10px] text-slate-500">Real-time feed</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsAlertsHistoryOpen(true);
                      fetchAlertsHistory(1);
                    }}
                    className="text-slate-400 hover:text-white border border-[#162235] bg-[#0c1524] px-3 py-1 rounded-xl text-[10px] font-semibold transition-colors"
                  >
                    View All
                  </button>
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

                      if (isCritical) {
                        borderClass = 'border-l-rose-500';
                        titleClass = 'text-rose-400';
                        bgOverlayClass = 'bg-rose-500/5 group-hover:bg-rose-500/10';
                      } else if (isWarning) {
                        borderClass = 'border-l-amber-500';
                        titleClass = 'text-amber-400';
                        bgOverlayClass = 'bg-amber-500/5 group-hover:bg-amber-500/10';
                      }

                      return (
                        <div
                          key={incident.id}
                          onClick={() => setSelectedSnapshot(incident)}
                          className={`bg-[#0d1624] border border-[#162235] p-3 rounded-xl border-l-4 relative overflow-hidden group flex-shrink-0 h-auto cursor-pointer hover:border-slate-600 transition-all ${borderClass}`}
                        >
                          {bgOverlayClass && <div className={`absolute inset-0 transition-colors pointer-events-none ${bgOverlayClass}`} />}
                          <div className="relative z-10 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-bold tracking-wide uppercase ${titleClass}`}>{incident.type}</span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {new Date(incident.timestamp || incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-normal">{incident.description}</p>
                            <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1 font-sans">
                              <span className="material-symbols-outlined text-[10px]">location_on</span>
                              <span>{incident.camera ? incident.camera.location : incident.location || 'Surveillance Area'}</span>
                            </div>
                            {incident.imageUrl && (
                              <div className="mt-2 relative rounded-lg overflow-hidden border border-white/5 aspect-video bg-black/50 group/thumb">
                                <img 
                                  src={incident.imageUrl} 
                                  alt="Incident snapshot thumbnail" 
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                                />
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
                  <button 
                    onClick={() => {
                      setIsAlertsHistoryOpen(true);
                      fetchAlertsHistory(1);
                    }}
                    className="w-full bg-[#121c2e] hover:bg-[#1a2942] text-slate-300 hover:text-white border border-[#1f2f4c] rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <span>View All Alerts</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              </aside>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          /* Settings tab view */
          <div className="flex-1 flex flex-col p-6 gap-6 min-h-0 w-full overflow-y-auto pr-1">
            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">System Settings</h2>
                <p className="text-xs text-slate-400 mt-0.5">Configure global alert parameters and thresholds for connected cameras</p>
              </div>
            </div>

            {/* Main content grid */}
            <div className="flex flex-col gap-6 max-w-4xl">
              {/* Camera Selection */}
              <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Select Camera</h3>
                  <p className="text-[10px] text-slate-500">Settings are loaded and applied on a per-camera basis</p>
                </div>
                <div className="flex items-center gap-3 bg-[#0d1625] border border-[#1b2a47] rounded-xl px-3 py-2 w-full md:w-80 shadow-inner">
                  <span className="material-symbols-outlined text-slate-400 text-sm">videocam</span>
                  <select
                    value={settingsPageCameraId || ''}
                    onChange={(e) => setSettingsPageCameraId(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none w-full cursor-pointer font-semibold"
                  >
                    <option value="" className="bg-[#090f19] text-slate-400">Choose a camera...</option>
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#090f19] text-white">
                        {c.name} ({c.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {settingsPageCameraId ? (
                <form onSubmit={handleSaveSettingsPage} className="flex flex-col gap-6">
                  {settingsPageError && (
                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl shadow-md">
                      {settingsPageError}
                    </div>
                  )}
                  {settingsPageSuccess && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl shadow-md">
                      {settingsPageSuccess}
                    </div>
                  )}

                  {settingsPageLoading && Object.keys(settingsPageValues).length === 0 ? (
                    <div className="text-center py-12 bg-[#090f19] border border-[#162235] rounded-2xl">
                      <p className="text-slate-400 text-xs">Loading camera configurations...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Intruder Detection restricted hours */}
                      <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-[#162235] pb-3 mb-1">
                          <span className="material-symbols-outlined text-violet-400 text-lg">shield</span>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Intruder & Perimeter Detection</h4>
                        </div>

                        {/* Intrusion Detection Enabled */}
                        <div className="flex justify-between items-center bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-300">Intrusion Alert Status</span>
                            <span className="text-[9px] text-slate-500">Trigger warnings for perimeter breaches</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={!!settingsPageValues.intrusionEnabled}
                              onChange={(e) => setSettingsPageValues({
                                ...settingsPageValues,
                                intrusionEnabled: e.target.checked
                              })}
                            />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                          </label>
                        </div>

                        {/* Restricted Hours Inputs */}
                        <div className="flex flex-col gap-3 bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <span className="text-xs font-semibold text-slate-300 mb-1">Restricted Hours (Detection Window)</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Start Time</label>
                              <input
                                type="time"
                                step="1"
                                className="bg-[#0a111c] border border-[#1b2b47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono w-full shadow-inner"
                                value={settingsPageValues.restrictedStartTime ? settingsPageValues.restrictedStartTime.substring(0, 8) : ''}
                                onChange={(e) => setSettingsPageValues({
                                  ...settingsPageValues,
                                  restrictedStartTime: e.target.value || null
                                })}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">End Time</label>
                              <input
                                type="time"
                                step="1"
                                className="bg-[#0a111c] border border-[#1b2b47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono w-full shadow-inner"
                                value={settingsPageValues.restrictedEndTime ? settingsPageValues.restrictedEndTime.substring(0, 8) : ''}
                                onChange={(e) => setSettingsPageValues({
                                  ...settingsPageValues,
                                  restrictedEndTime: e.target.value || null
                                })}
                              />
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-500 leading-normal mt-1">
                            Alerts will only trigger during this schedule. Leave empty to allow 24/7 detection.
                          </span>
                        </div>

                        {/* Cooldown Seconds */}
                        <div className="flex flex-col gap-1.5 bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-slate-300">Alert Cooldown Time</span>
                            <span className="bg-violet-600/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                              {settingsPageValues.cooldownSeconds || 60}s
                            </span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="300"
                            step="5"
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 mt-1"
                            value={settingsPageValues.cooldownSeconds !== undefined ? settingsPageValues.cooldownSeconds : 60}
                            onChange={(e) => setSettingsPageValues({
                              ...settingsPageValues,
                              cooldownSeconds: parseInt(e.target.value, 10)
                            })}
                          />
                          <span className="text-[9px] text-slate-500">
                            Minimum duration in seconds between subsequent incident alerts.
                          </span>
                        </div>
                      </div>

                      {/* Crowd criteria & config */}
                      <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-[#162235] pb-3 mb-1">
                          <span className="material-symbols-outlined text-violet-400 text-lg">groups</span>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Crowd & Analytics Criteria</h4>
                        </div>

                        {/* Crowd Alerts Enabled */}
                        <div className="flex justify-between items-center bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-300">Crowd Alert Status</span>
                            <span className="text-[9px] text-slate-500">Trigger warnings for density spikes</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={!!settingsPageValues.crowdEnabled}
                              onChange={(e) => setSettingsPageValues({
                                ...settingsPageValues,
                                crowdEnabled: e.target.checked
                              })}
                            />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                          </label>
                        </div>

                        {/* Crowd threshold */}
                        <div className="flex flex-col gap-1.5 bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-slate-300">Default Crowd Limit</span>
                            <span className="bg-violet-600/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                              {settingsPageValues.crowdThreshold || 3} people
                            </span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="50"
                            step="1"
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 mt-1"
                            value={settingsPageValues.crowdThreshold !== undefined ? settingsPageValues.crowdThreshold : 3}
                            onChange={(e) => setSettingsPageValues({
                              ...settingsPageValues,
                              crowdThreshold: parseInt(e.target.value, 10)
                            })}
                          />
                          <span className="text-[9px] text-slate-500">
                            The minimum count of concurrent people detected required to flag as a crowd alert.
                          </span>
                        </div>

                        {/* Confidence threshold */}
                        <div className="flex flex-col gap-1.5 bg-[#0d1625] border border-[#17253d] rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-slate-300">AI Model Confidence</span>
                            <span className="bg-violet-600/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                              {Math.round((settingsPageValues.confidenceThreshold || 0.4) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="0.9"
                            step="0.05"
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 mt-1"
                            value={settingsPageValues.confidenceThreshold !== undefined ? settingsPageValues.confidenceThreshold : 0.4}
                            onChange={(e) => setSettingsPageValues({
                              ...settingsPageValues,
                              confidenceThreshold: parseFloat(e.target.value)
                            })}
                          />
                          <span className="text-[9px] text-slate-500">
                            Confidence limit required by the object-detector to classify human figures.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={settingsPageLoading}
                      className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition-colors shrink-0"
                    >
                      {settingsPageLoading ? 'Saving changes...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-12 bg-[#090f19] border border-[#162235] rounded-2xl">
                  <p className="text-slate-400 text-xs">Please choose or register a camera to configure settings.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Operator management tab view */
          <div className="flex-1 flex overflow-hidden p-6 gap-6 min-h-0 w-full">
            {/* Left Column: Operator List */}
            <section className="bg-[#090f19] border border-[#162235] flex-1 rounded-2xl p-6 flex flex-col h-full overflow-hidden shadow-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 shrink-0">Registered Operators</h3>
              
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                {operators.length === 0 ? (
                  <p className="text-slate-500 text-xs">No operators registered.</p>
                ) : (
                  <div className="w-full flex flex-col gap-2">
                    <div className="grid grid-cols-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-2 border-b border-[#162235] px-4 shrink-0">
                      <span>Name</span>
                      <span>Email Address</span>
                      <span className="text-right">Action</span>
                    </div>
                    {operators.map((op) => (
                      <div key={op.id} className="grid grid-cols-3 items-center py-3 border-b border-[#162235] hover:bg-white/5 transition-colors rounded-xl px-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs uppercase">
                            {op.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-white">{op.name}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px] truncate">{op.email}</span>
                        <div className="text-right">
                          <button
                            onClick={() => handleDeleteOperator(op.id, op.name)}
                            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Right Column: Add Operator Form */}
            <section className="bg-[#090f19] border border-[#162235] w-96 rounded-2xl p-6 flex flex-col h-fit shrink-0 shadow-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 shrink-0">Register Operator</h3>
              
              <form onSubmit={handleAddOperator} className="flex flex-col gap-4">
                {opError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                    {opError}
                  </div>
                )}
                {opSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
                    {opSuccess}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                  <input
                    type="text"
                    className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans"
                    placeholder="Enter full name"
                    value={newOpName}
                    onChange={(e) => setNewOpName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                  <input
                    type="email"
                    className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans"
                    placeholder="operator@nirikshan.com"
                    value={newOpEmail}
                    onChange={(e) => setNewOpEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Temporary Password</label>
                  <input
                    type="password"
                    className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans"
                    placeholder="••••••••"
                    value={newOpPassword}
                    onChange={(e) => setNewOpPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl font-semibold text-xs shadow-[0_0_15px_rgba(124,58,237,0.2)] mt-2 transition-colors"
                >
                  Create Operator
                </button>
              </form>
            </section>
          </div>
        )}
      </div>

      {/* AI Parameters Settings Panel Slider */}
      {isSettingsOpen && selectedCamera && (
        <aside className="fixed top-24 right-6 bottom-6 w-80 bg-[#090f19]/95 backdrop-blur-md border border-[#162235] rounded-2xl flex flex-col z-[150] shadow-2xl overflow-hidden animate-[slideIn_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className="p-4 border-b border-[#162235] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-400 text-sm">settings</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Parameters</h4>
            </div>
            <button 
              className="text-slate-400 hover:text-white text-lg font-bold" 
              onClick={() => setIsSettingsOpen(false)}
            >
              ×
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {settingsError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {settingsError}
              </div>
            )}
            {settingsSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
                {settingsSuccess}
              </div>
            )}
            
            {settingsLoading && configSchema.length === 0 ? (
              <p className="text-slate-400 text-xs">Loading settings...</p>
            ) : (
              Object.entries(
                configSchema.reduce((acc, entry) => {
                  const cat = entry.category || 'General';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(entry);
                  return acc;
                }, {})
              ).map(([category, entries]) => (
                <div key={category} className="flex flex-col gap-3">
                  <h5 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider border-b border-[#162235] pb-1">{category}</h5>
                  {entries.map(entry => (
                    <div key={entry.key} className="flex flex-col gap-1.5 bg-[#0e1624] border border-[#17253d] rounded-xl p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-300">{entry.label}</span>
                        {entry.type !== 'boolean' && entry.type !== 'time' && (
                          <span className="bg-violet-600/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                            {settingsValues[entry.key]}
                          </span>
                        )}
                      </div>
                      
                      {entry.type === 'boolean' ? (
                        <label className="relative inline-flex items-center cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!!settingsValues[entry.key]}
                            onChange={(e) => setSettingsValues({
                              ...settingsValues,
                              [entry.key]: e.target.checked
                            })}
                          />
                          <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                        </label>
                      ) : entry.type === 'integer' || entry.type === 'float' ? (
                        <input
                          type="range"
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 mt-1.5"
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
                          className="bg-[#0a111c] border border-[#1b2b47] rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 mt-1 font-mono w-full"
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
                          className="bg-[#0a111c] border border-[#1b2b47] rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 mt-1 font-mono w-full"
                          value={settingsValues[entry.key] || ''}
                          onChange={(e) => setSettingsValues({
                            ...settingsValues,
                            [entry.key]: e.target.value
                          })}
                        />
                      )}
                      <span className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                        {entry.description}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-[#162235] shrink-0">
            <button 
              className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-xl font-medium text-xs shadow-[0_0_15px_rgba(124,58,237,0.2)] transition-colors"
              onClick={handleSaveSettings}
              disabled={settingsLoading}
            >
              {settingsLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </aside>
      )}

      {/* Add Camera Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-[#090f19] border border-[#162235] w-full max-w-md rounded-2xl p-6 flex flex-col shadow-2xl relative font-sans">
            <div className="flex justify-between items-center pb-3 border-b border-[#162235] mb-4 shrink-0">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Register New Camera</h3>
              <button className="text-slate-400 hover:text-white text-lg font-bold" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddCamera} className="flex flex-col gap-4">
              {modalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl shrink-0">
                  {modalError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Camera Name</label>
                <input
                  type="text"
                  className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans"
                  placeholder="e.g. Front Gate Entrance"
                  value={camName}
                  onChange={(e) => setCamName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</label>
                <input
                  type="text"
                  className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans"
                  placeholder="e.g. Lobby / Parking Lot"
                  value={camLocation}
                  onChange={(e) => setCamLocation(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Source Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      camSourceType === 'webcam'
                        ? 'bg-violet-600/10 border-violet-500 text-violet-400 font-bold'
                        : 'bg-transparent border-[#1b2a47] text-slate-400 hover:bg-white/5'
                    }`}
                    onClick={() => handleSourceTypeChange('webcam')}
                  >
                    Webcam (USB)
                  </button>
                  <button
                    type="button"
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      camSourceType === 'rtsp'
                        ? 'bg-violet-600/10 border-violet-500 text-violet-400 font-bold'
                        : 'bg-transparent border-[#1b2a47] text-slate-400 hover:bg-white/5'
                    }`}
                    onClick={() => handleSourceTypeChange('rtsp')}
                  >
                    RTSP / Network IP
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {camSourceType === 'webcam' ? 'Webcam Device Index' : 'RTSP Network Address'}
                </label>
                <input
                  type="text"
                  className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans"
                  placeholder={camSourceType === 'webcam' ? '0, 1, 2' : 'rtsp://user:pass@ip:port/h264'}
                  value={camRtspUrl}
                  onChange={(e) => setCamRtspUrl(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end mt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#1b2a47] text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-500 transition-colors shadow-[0_0_15px_rgba(124,58,237,0.2)] disabled:opacity-60"
                >
                  Register Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[300] bg-[#0c1524] border border-[#1b2a47] rounded-xl shadow-2xl py-1.5 flex flex-col min-w-[150px] font-sans"
          style={{
            top: `${Math.min(contextMenu.y, window.innerHeight - 120)}px`,
            left: `${Math.min(contextMenu.x, window.innerWidth - 180)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#fbbf24] hover:bg-white/5 transition-all text-left"
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
            <span className="material-symbols-outlined text-sm">polyline</span>
            <span>Virtual Perimeter</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-white/5 transition-all text-left"
            onClick={(e) => handleDeleteCamera(e, contextMenu.cameraId, contextMenu.cameraName)}
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            <span>Delete Camera</span>
          </button>
        </div>
      )}
      {/* Incident Snapshot Viewer Modal Overlay */}
      {selectedSnapshot && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250] p-4 font-sans">
          <div className="bg-[#090f19] border border-[#162235] w-full max-w-4xl rounded-2xl flex flex-col md:flex-row shadow-2xl relative overflow-hidden h-[85vh] max-h-[600px] animate-[scaleIn_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            
            {/* Close Button */}
            <button 
              className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center z-50 text-xl font-bold transition-colors border border-white/10" 
              onClick={() => setSelectedSnapshot(null)}
            >
              ×
            </button>

            {/* Left Column: Image Snapshot Area */}
            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden h-1/2 md:h-full group">
              {selectedSnapshot.imageUrl ? (
                <img 
                  src={selectedSnapshot.imageUrl} 
                  alt="Incident Snapshot" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-8">
                  <span className="material-symbols-outlined text-slate-600 text-5xl mb-2">image_not_supported</span>
                  <p className="text-slate-400 text-xs">No snapshot image available for this alert.</p>
                </div>
              )}
              {/* Telemetry overlay labels inside image */}
              <div className="absolute top-4 left-4 bg-[#090f19]/80 backdrop-blur-md px-3 py-1.5 border border-white/10 rounded-lg text-[9px] font-bold text-slate-300 font-mono flex items-center gap-1.5 shadow-md">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                <span>TELEMETRY OVERLAY FRAME</span>
              </div>
            </div>

            {/* Right Column: Telemetry details sidebar */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[#162235] bg-[#0c1524] p-6 flex flex-col justify-between shrink-0 h-1/2 md:h-full overflow-y-auto">
              <div className="flex flex-col gap-5">
                <div>
                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                    {selectedSnapshot.severity || 'CRITICAL'}
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-2.5">{selectedSnapshot.type}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {selectedSnapshot.id}</p>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Location Info */}
                  <div className="flex flex-col gap-1 bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Detection Location</span>
                    <div className="flex items-center gap-1.5 text-xs text-white mt-0.5">
                      <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                      <span>{selectedSnapshot.camera ? selectedSnapshot.camera.location : selectedSnapshot.location || 'Surveillance Zone'}</span>
                    </div>
                    {selectedSnapshot.camera && (
                      <span className="text-[10px] text-slate-400 font-medium font-sans mt-0.5">
                        Camera: {selectedSnapshot.camera.name}
                      </span>
                    )}
                  </div>

                  {/* Description Info */}
                  <div className="flex flex-col gap-1 bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Alert Details</span>
                    <p className="text-xs text-slate-300 leading-normal mt-0.5">{selectedSnapshot.description}</p>
                  </div>

                  {/* Timestamp Info */}
                  <div className="flex flex-col gap-1 bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Incident Timestamp</span>
                    <div className="flex items-center gap-1.5 text-xs text-white mt-0.5 font-mono">
                      <span className="material-symbols-outlined text-sm text-slate-400 font-sans">schedule</span>
                      <span>{new Date(selectedSnapshot.timestamp || selectedSnapshot.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-[#162235]">
                {selectedSnapshot.imageUrl && (
                  <a 
                    href={selectedSnapshot.imageUrl}
                    download={`incident-${selectedSnapshot.id}.jpg`}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white text-center py-2.5 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-violet-600/15"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>Download Snapshot</span>
                  </a>
                )}
                <button 
                  onClick={() => setSelectedSnapshot(null)}
                  className="w-full bg-[#121c2e] hover:bg-[#1a2942] text-slate-300 hover:text-white border border-[#1f2f4c] py-2.5 rounded-xl text-xs font-semibold transition-colors"
                >
                  Close Viewer
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
      {/* Historical Alerts Log Modal Overlay */}
      {isAlertsHistoryOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[220] p-4 font-sans animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="bg-[#090f19] border border-[#162235] w-full max-w-5xl rounded-2xl flex flex-col shadow-2xl relative overflow-hidden h-[80vh] max-h-[700px] animate-[scaleIn_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            
            {/* Header */}
            <div className="p-5 border-b border-[#162235] bg-[#0c1524] flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Historical Alerts Log</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Review all recorded perimeter intrusions and crowd limit notifications</p>
              </div>
              <button 
                className="text-slate-400 hover:text-white text-xl font-bold bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center border border-white/5 transition-all"
                onClick={() => setIsAlertsHistoryOpen(false)}
              >
                ×
              </button>
            </div>

            {/* Table Area / Body */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {historyError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl mb-4">
                  {historyError}
                </div>
              )}

              {historyLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-xs font-semibold">Loading historical alerts...</p>
                </div>
              ) : historyIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-slate-500">
                  <span className="material-symbols-outlined text-4xl">notifications_off</span>
                  <p className="text-xs">No historical alerts found in database logs.</p>
                </div>
              ) : (
                <div className="w-full flex flex-col min-w-[700px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-2.5 border-b border-[#162235] px-4 shrink-0">
                    <span className="col-span-2">Event</span>
                    <span className="col-span-2">Severity</span>
                    <span className="col-span-2">Camera</span>
                    <span className="col-span-4">Details / Description</span>
                    <span className="col-span-2">Timestamp</span>
                  </div>

                  {/* Table Rows */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    {historyIncidents.map((incident) => {
                      const isCritical = incident.severity === 'CRITICAL';
                      const isWarning = incident.severity === 'WARNING' || incident.severity === 'HIGH' || incident.type.includes('CROWD');
                      let sevBadgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                      
                      if (isCritical) {
                        sevBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                      } else if (isWarning) {
                        sevBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                      }

                      return (
                        <div 
                          key={incident.id} 
                          onClick={() => {
                            setSelectedSnapshot(incident);
                          }}
                          className="grid grid-cols-12 items-center py-3 border-b border-[#162235]/40 hover:bg-white/5 transition-all rounded-xl px-4 text-xs text-slate-300 cursor-pointer"
                        >
                          <span className="col-span-2 font-bold text-white tracking-wide truncate">{incident.type}</span>
                          <span className="col-span-2">
                            <span className={`border px-2 py-0.5 rounded-full text-[9px] font-bold ${sevBadgeColor}`}>
                              {incident.severity}
                            </span>
                          </span>
                          <span className="col-span-2 font-semibold text-slate-400 truncate">
                            {incident.camera ? incident.camera.name : incident.location || 'Surveillance'}
                          </span>
                          <span className="col-span-4 text-slate-300 leading-relaxed pr-4 truncate">{incident.description}</span>
                          <span className="col-span-2 font-mono text-[10px] text-slate-500">
                            {new Date(incident.timestamp || incident.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pagination / Footer */}
            <div className="p-4 border-t border-[#162235] bg-[#0c1524] flex justify-between items-center shrink-0 text-xs">
              <span className="text-slate-500 font-semibold">
                Total Logs: <span className="text-slate-300 font-bold">{historyTotalRecords}</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  disabled={historyPage <= 1 || historyLoading}
                  onClick={() => fetchAlertsHistory(historyPage - 1)}
                  className="px-3 py-1.5 bg-[#121c2e] hover:bg-[#1a2942] disabled:opacity-40 text-slate-300 hover:text-white border border-[#1f2f4c] rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-slate-400 font-mono font-semibold">
                  Page {historyPage} of {historyTotalPages}
                </span>
                <button
                  disabled={historyPage >= historyTotalPages || historyLoading}
                  onClick={() => fetchAlertsHistory(historyPage + 1)}
                  className="px-3 py-1.5 bg-[#121c2e] hover:bg-[#1a2942] disabled:opacity-40 text-slate-300 hover:text-white border border-[#1f2f4c] rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
