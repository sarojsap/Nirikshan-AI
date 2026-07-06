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
        setRegResult({ success: true, data: body.data || body });
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
    if (!window.confirm(`Delete device "${deviceName}"? This cannot be undone.`)) return;
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
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Edge Devices</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage registered edge surveillance devices</p>
        </div>
        <button
          onClick={() => setShowRegister(!showRegister)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)]"
        >
          <span className="material-symbols-outlined text-sm">{showRegister ? 'close' : 'add'}</span>
          <span>{showRegister ? 'Cancel' : 'Register Device'}</span>
        </button>
      </div>

      {showRegister && (
        <form onSubmit={handleRegister} className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Register New Edge Device</h3>
          {regResult?.success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
              Device registered! Save these credentials —<br />
              <span className="font-mono mt-1 block">ID: {regResult.data.id}</span>
              <span className="font-mono block">API Key: {regResult.data.apiKey}</span>
            </div>
          )}
          {regResult?.success === false && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{regResult.error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Device Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                placeholder="e.g. Office-Cam-1"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                placeholder="e.g. Main Office"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={registering}
            className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all"
          >
            {registering ? 'Registering...' : 'Register Device'}
          </button>
        </form>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{error}</div>
      )}

      {loading && devices.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"><span className="text-slate-400 text-xs">Loading devices...</span></div>
      ) : devices.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"><span className="text-slate-500 text-xs">No devices registered. Click "Register Device" to add one.</span></div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-5 text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-2 border-b border-[#162235] px-4">
            <span>Name</span><span>Location</span><span>Status</span><span>Last Heartbeat</span><span className="text-right">Action</span>
          </div>
          {devices.map((d) => (
            <div key={d.id} className="grid grid-cols-5 items-center py-3 border-b border-[#162235] hover:bg-white/5 transition-colors rounded-xl px-4 text-xs">
              <span className="font-semibold text-white">{d.name}</span>
              <span className="text-slate-400">{d.location || '—'}</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${d.isActive !== false ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span className={d.isActive !== false ? 'text-emerald-400' : 'text-rose-400'}>
                  {d.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                {d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleString() : 'Never'}
              </span>
              <div className="text-right">
                <button
                  onClick={() => handleDelete(d.id, d.name)}
                  className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[10px] font-semibold rounded-xl transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
