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
    if (!window.confirm(`Delete edge device "${deviceName}"? This action will revoke its cloud synchronization key.`)) return;
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
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0d1627] via-[#101e38] to-[#0d1627] border border-[#1b2b48] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-emerald-400 text-xl">router</span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Registered Edge Devices</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium">Manage and monitor hardware nodes running AI detection locally</p>
        </div>
        <button
          onClick={() => setShowRegister(!showRegister)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary-hover hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-sm">{showRegister ? 'close' : 'add'}</span>
          <span>{showRegister ? 'Close Panel' : 'Register New Device'}</span>
        </button>
      </div>

      {/* Registration Form Card */}
      {showRegister && (
        <form onSubmit={handleRegister} className="bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4 border-b border-[#182640] pb-3">
            <span className="material-symbols-outlined text-primary text-lg">app_registration</span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Device Onboarding & Provisioning</h3>
          </div>

          {regResult?.success && (
            <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl shadow-lg">
              <div className="flex items-center gap-2 font-bold mb-1.5 text-emerald-400">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Device Successfully Registered!</span>
              </div>
              <p className="text-slate-300 text-[11px] mb-2">Save these generated credentials to configure your local edge node's `.env` settings:</p>
              <div className="bg-[#090f19] border border-[#162235] p-3 rounded-lg flex flex-col gap-1 font-mono text-[11px]">
                <span className="text-slate-400"><strong className="text-white">Device ID:</strong> {regResult.data.id}</span>
                <span className="text-slate-400"><strong className="text-white">API Key:</strong> <code className="text-emerald-400">{regResult.data.apiKey}</code></span>
              </div>
            </div>
          )}

          {regResult?.success === false && (
            <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{regResult.error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Device Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-[#0d1626] border border-[#1b2a47] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary shadow-inner font-medium"
                placeholder="e.g. Main-Building-Edge-Node"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Installation Location</label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="bg-[#0d1626] border border-[#1b2a47] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary shadow-inner font-medium"
                placeholder="e.g. Ground Floor Security Command"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={registering}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {registering ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Provisioning Device...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>Provision Device</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2 shadow-lg">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Devices Grid */}
      {loading && devices.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] rounded-2xl">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-semibold animate-pulse">Loading active devices...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] rounded-2xl text-center">
          <span className="material-symbols-outlined text-slate-600 text-4xl mb-3">memory</span>
          <p className="text-sm font-bold text-white mb-1">No Registered Edge Devices</p>
          <p className="text-xs text-slate-400 max-w-sm">Click "Register New Device" to generate API credentials for your local AI server.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {devices.map((d) => {
            const isActive = d.isActive !== false;
            return (
              <div
                key={d.id}
                className="bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] hover:border-primary/40 rounded-2xl p-5 shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/5 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-lg">dns</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-white truncate group-hover:text-primary transition-colors">{d.name}</h3>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{d.id}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border shrink-0 ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                      <span>{isActive ? 'ONLINE' : 'OFFLINE'}</span>
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 bg-[#090f19] border border-[#162235] rounded-xl p-3 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-slate-500">location_on</span> Location
                      </span>
                      <span className="font-bold text-white text-right truncate max-w-[150px]">{d.location || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-[#162235] pt-2">
                      <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-slate-500">favorite</span> Heartbeat
                      </span>
                      <span className="font-mono text-[10px] text-slate-300 font-semibold">
                        {d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-[#182640]">
                  <button
                    onClick={() => handleDelete(d.id, d.name)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-[10px] font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">delete</span>
                    <span>Revoke Device</span>
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
