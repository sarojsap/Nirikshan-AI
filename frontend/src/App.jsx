import { useCallback, useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import { detectMode, setMode, CLOUD_API, DEPLOY_MODE } from './config';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });
  const [mode, setModeState] = useState(detectMode);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [deviceRegStep, setDeviceRegStep] = useState(null);
  const [deviceRegError, setDeviceRegError] = useState('');

  useEffect(() => {
    setMode(mode);
  }, [mode]);

  const handleAuthSuccess = (newToken, authUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(authUser));
    setToken(newToken);
    setUser(authUser);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  }, []);

  const switchMode = (newMode) => {
    setModeState(newMode);
    setShowModeSelector(false);
    handleLogout();
  };

  const startDeviceRegistration = async () => {
    setDeviceRegStep('registering');
    setDeviceRegError('');
    try {
      const res = await fetch(`${CLOUD_API.AUTH}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@nirikshan.cloud',
          password: 'Admin@123',
        }),
      });
      if (!res.ok) {
        setDeviceRegError('Could not connect to cloud. Make sure the cloud backend is running.');
        setDeviceRegStep(null);
        return;
      }
      const data = await res.json();
      const cloudToken = data.data.token;
      const deviceRes = await fetch(`${CLOUD_API.DEVICES}`, {
        headers: { Authorization: `Bearer ${cloudToken}` },
      });
      if (deviceRes.ok) {
        const devices = await deviceRes.json();
        if (devices.length > 0) {
          const d = devices[0];
          localStorage.setItem('nirikshan_edge_id', d.id);
          localStorage.setItem('nirikshan_edge_api_key', '');
          setDeviceRegStep('done');
          setTimeout(() => setDeviceRegStep(null), 2000);
        } else {
          setDeviceRegError('No edge devices found. Register one via the cloud dashboard.');
          setDeviceRegStep(null);
        }
      } else {
        setDeviceRegError('Failed to fetch edge devices.');
        setDeviceRegStep(null);
      }
    } catch {
      setDeviceRegError('Cloud connection failed.');
      setDeviceRegStep(null);
    }
  };

  if (!token) {
    return (
      <>
        {showModeSelector && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
            <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-2">Select Connection Mode</h2>
              <p className="text-xs text-slate-400 mb-6">Choose how to connect to the Nirikshan system</p>
              <div className="space-y-3">
                <button
                  onClick={() => switchMode('edge')}
                  className="w-full bg-[#0c1524] hover:bg-violet-600/10 border border-[#162235] hover:border-violet-500/30 rounded-xl p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-emerald-400">lan</span>
                    <div>
                      <p className="text-sm font-bold text-white">Edge (Local LAN)</p>
                      <p className="text-[10px] text-slate-400">Connect directly to the edge server on your local network</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => switchMode('cloud')}
                  className="w-full bg-[#0c1524] hover:bg-violet-600/10 border border-[#162235] hover:border-violet-500/30 rounded-xl p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-violet-400">cloud</span>
                    <div>
                      <p className="text-sm font-bold text-white">Cloud (Remote)</p>
                      <p className="text-[10px] text-slate-400">Connect via the cloud dashboard from anywhere</p>
                    </div>
                  </div>
                </button>
              </div>
              {deviceRegStep === 'registering' && (
                <div className="mt-4 text-xs text-violet-400 font-semibold text-center">
                  Connecting to cloud...
                </div>
              )}
              {deviceRegError && (
                <div className="mt-4 text-xs text-rose-400 font-semibold text-center">{deviceRegError}</div>
              )}
              {deviceRegStep === 'done' && (
                <div className="mt-4 text-xs text-emerald-400 font-semibold text-center">
                  Edge device linked successfully!
                </div>
              )}
              <button
                onClick={() => setShowModeSelector(false)}
                className="mt-4 w-full text-xs text-slate-500 hover:text-white py-2 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}
        <Login
          onAuthSuccess={handleAuthSuccess}
          onModeSelect={DEPLOY_MODE ? undefined : () => setShowModeSelector(true)}
          currentMode={mode}
          onRegisterDevice={DEPLOY_MODE ? undefined : startDeviceRegistration}
        />
      </>
    );
  }

  return (
    <Dashboard
      token={token}
      user={user}
      onLogout={handleLogout}
      mode={mode}
      onModeSwitch={switchMode}
    />
  );
}

export default App;
