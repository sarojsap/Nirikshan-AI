import { useState, useEffect } from 'react';
import { CLOUD_API } from '../config';

export default function DeviceSettingsPanel({ token, onLogout }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [configValues, setConfigValues] = useState({});
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!token) return;
    fetchDevices();
  }, [token]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CLOUD_API.DEVICES}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onLogout?.(); return; }
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch {
      // Cloud not reachable
    } finally {
      setLoading(false);
    }
  };

  const selectDevice = (device) => {
    setSelectedDevice(device);
    setConfigValues(device.config || {});
    setSaveStatus('');
  };

  const updateConfigValue = (key, value) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  const saveConfig = async () => {
    if (!selectedDevice) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`${CLOUD_API.DEVICES}/${selectedDevice.id}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config: configValues }),
      });
      if (res.status === 401) { onLogout?.(); return; }
      if (res.ok) {
        const data = await res.json();
        setSelectedDevice(data);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        const data = await res.json();
        setSaveStatus(`error: ${data.error}`);
      }
    } catch {
      setSaveStatus('error: Connection failed');
    }
  };

  return (
    <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Edge Devices</h3>
          <p className="text-[10px] text-slate-500">Configure remote edge devices from the cloud</p>
          <p className="text-[9px] text-amber-400 mt-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            These are device-level default values. Per-camera settings configured in the edge backend will override these values.
          </p>
        </div>
        <button
          onClick={fetchDevices}
          className="px-3 py-1.5 bg-[#0c1524] hover:bg-[#15233d] border border-[#1f2f4c] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {loading && devices.length === 0 ? (
        <div className="text-slate-500 text-xs p-4 text-center">Loading devices...</div>
      ) : devices.length === 0 ? (
        <div className="text-slate-500 text-xs p-4 text-center">
          No edge devices registered. Add one via the Devices API or use the edge backend.
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-64 shrink-0">
            <div className="space-y-1">
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => selectDevice(device)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-left transition-all ${
                    selectedDevice?.id === device.id
                      ? 'bg-violet-600/15 border border-violet-500/20 text-white'
                      : 'hover:bg-white/5 text-slate-400 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      device.status === 'ONLINE' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-500'
                    }`} />
                    <span className="truncate">{device.name}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-2">
                    v{device.version || '?'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedDevice && (
            <div className="flex-1 bg-[#0d1625] border border-[#1b2a47] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-white">{selectedDevice.name}</h4>
                  <p className="text-[10px] text-slate-500">
                    Last heartbeat: {selectedDevice.lastHeartbeat
                      ? new Date(selectedDevice.lastHeartbeat).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedDevice.status === 'ONLINE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                }`}>
                  {selectedDevice.status}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Confidence Threshold
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={configValues.confidenceThreshold ?? 0.5}
                    onChange={(e) => updateConfigValue('confidenceThreshold', parseFloat(e.target.value))}
                    className="w-full bg-[#060b13] border border-[#162235] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cooldown (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={configValues.cooldownSeconds ?? 10}
                    onChange={(e) => updateConfigValue('cooldownSeconds', parseInt(e.target.value))}
                    className="w-full bg-[#060b13] border border-[#162235] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Alerts Enabled
                  </label>
                  <button
                    onClick={() => updateConfigValue('alertsEnabled', !(configValues.alertsEnabled ?? true))}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      (configValues.alertsEnabled ?? true) ? 'bg-violet-600' : 'bg-slate-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow ${
                      (configValues.alertsEnabled ?? true) ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveConfig}
                  disabled={saveStatus === 'saving'}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  {saveStatus === 'saving' ? 'Saving...' : 'Push Config to Edge'}
                </button>
                {saveStatus === 'success' && (
                  <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Configuration pushed
                  </span>
                )}
                {saveStatus.startsWith('error') && (
                  <span className="text-rose-400 text-[10px] font-semibold">
                    {saveStatus}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
