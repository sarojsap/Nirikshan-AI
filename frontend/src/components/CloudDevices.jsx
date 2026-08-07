import { useState, useEffect } from 'react';
import { CLOUD_API } from '../config';

export default function CloudDevices({ token, onLogout }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ name: '', location: '' });
  const [registering, setRegistering] = useState(false);
  const [regResult, setRegResult] = useState(null);

  const [copiedField, setCopiedField] = useState(null);

  const fetchDevices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(CLOUD_API.DEVICES, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onLogout?.(); return; }
      if (!res.ok) { setError('Failed to load devices'); return; }
      const body = await res.json();
      setDevices(body.data ?? body);
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    setRegResult(null);
    try {
      const res = await fetch(CLOUD_API.DEVICES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.status === 401) { onLogout?.(); return; }
      const body = await res.json();
      if (res.ok) {
        const payload = body.data || body;
        const deviceObj = payload.device || payload;
        const deviceId = deviceObj.id || payload.id;
        const apiKey = payload.apiKey || deviceObj.apiKey;

        setRegResult({
          success: true,
          deviceId,
          apiKey,
          deviceName: form.name,
        });
        setForm({ name: '', location: '' });
        fetchDevices();
      } else {
        setRegResult({ success: false, error: body.error || 'Registration failed' });
      }
    } catch {
      setRegResult({ success: false, error: 'Connection error' });
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (deviceId, deviceName) => {
    if (!window.confirm(`Delete edge device "${deviceName}"?`)) return;
    try {
      const res = await fetch(`${CLOUD_API.DEVICES}/${deviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onLogout?.(); return; }
      if (!res.ok) { alert('Failed to delete device'); return; }
      fetchDevices();
    } catch {
      alert('Connection error');
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-lg font-bold text-white tracking-tight">Edge Devices</h2>
        <button
          onClick={() => setShowRegister(!showRegister)}
          className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {showRegister ? 'Close' : 'Register Device'}
        </button>
      </div>

      {/* Provision Form & Generated Credentials Card */}
      {showRegister && (
        <form onSubmit={handleRegister} className="bg-[#0b1320] border border-[#16233b] rounded-2xl p-5 shadow-lg animate-fade-in">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Register Device</h3>

          {regResult?.success && (
            <div className="mb-5 p-4 bg-[#080e18] border border-[#1a2942] rounded-xl shadow-xl space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    Device Registered: <span className="text-slate-300 font-normal">{regResult.deviceName}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRegResult(null)}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="bg-[#04070d] border border-[#131d2e] rounded-lg p-3 space-y-2 font-mono text-[11px]">
                {/* EDGE_ID */}
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate">
                    <span className="text-slate-500 select-none">EDGE_ID=</span>
                    <span className="text-slate-200">{regResult.deviceId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(regResult.deviceId);
                      setCopiedField('id');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    className="px-2.5 py-1 bg-[#121c2d] hover:bg-[#1a2942] border border-[#1c2c47] rounded text-[10px] text-slate-300 font-sans transition-all cursor-pointer shrink-0"
                  >
                    {copiedField === 'id' ? 'Copied!' : 'Copy ID'}
                  </button>
                </div>

                {/* EDGE_API_KEY */}
                <div className="flex items-center justify-between gap-3 border-t border-[#0e1726] pt-2">
                  <div className="truncate">
                    <span className="text-slate-500 select-none">EDGE_API_KEY=</span>
                    <span className="text-slate-200">{regResult.apiKey}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(regResult.apiKey);
                      setCopiedField('key');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    className="px-2 py-1 bg-[#121c2d] hover:bg-[#1a2942] border border-[#1c2c47] rounded text-[10px] text-slate-300 font-sans transition-all cursor-pointer shrink-0"
                  >
                    {copiedField === 'key' ? 'Copied!' : 'Copy Key'}
                  </button>
                </div>

                {/* CLOUD_API_URL */}
                <div className="flex items-center justify-between gap-3 border-t border-[#0e1726] pt-2">
                  <div className="truncate">
                    <span className="text-slate-500 select-none">CLOUD_API_URL=</span>
                    <span className="text-slate-300">https://nirikshan.cloud/api</span>
                  </div>
                </div>
              </div>

              {/* Copy Full .env Block Button */}
              <button
                type="button"
                onClick={() => {
                  const envBlock = `EDGE_ID=${regResult.deviceId}\nEDGE_API_KEY=${regResult.apiKey}\nCLOUD_API_URL=https://nirikshan.cloud/api`;
                  navigator.clipboard.writeText(envBlock);
                  setCopiedField('env');
                  setTimeout(() => setCopiedField(null), 2000);
                }}
                className="w-full py-2 bg-[#121d30] hover:bg-[#182740] border border-[#1e3252] text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{copiedField === 'env' ? 'Copied .env Configuration!' : 'Copy .env Configuration'}</span>
              </button>
            </div>
          )}

          {regResult?.success === false && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
              {regResult.error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-[#080e18] border border-[#142036] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
              placeholder="Device Name"
            />
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="bg-[#080e18] border border-[#142036] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
              placeholder="Location"
            />
          </div>

          <button
            type="submit"
            disabled={registering}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {registering ? 'Registering...' : 'Save Device'}
          </button>
        </form>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Devices Grid */}
      {loading && devices.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">Loading devices...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-12 bg-[#0b1320] border border-[#16233b] rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">No registered edge devices.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => {
            const isActive = d.isActive !== false;
            return (
              <div
                key={d.id}
                className="bg-[#0b1320] border border-[#16233b] hover:border-slate-700 rounded-2xl p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white truncate">{d.name}</h3>
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                      <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isActive ? 'Active' : 'Offline'}
                      </span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-medium mb-3">{d.location || '—'}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#142036]">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No Heartbeat'}
                  </span>
                  <button
                    onClick={() => handleDelete(d.id, d.name)}
                    className="text-rose-400 hover:text-rose-300 text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
