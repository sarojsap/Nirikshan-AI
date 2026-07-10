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
    <div className="bg-soc-sidebar border border-soc-border rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-soc-textPrimary uppercase tracking-wider">Edge Devices</h3>
          <p className="text-[10px] text-soc-textMuted font-medium">Configure remote edge devices from the cloud</p>
          <p className="text-[9px] text-soc-warning mt-2 bg-soc-warning/10 border border-soc-warning/20 rounded-xl px-3 py-2">
            These are device-level default values. Per-camera settings configured in the edge backend will override these values.
          </p>
        </div>
        <button
          onClick={fetchDevices}
          className="px-3 py-1.5 bg-soc-card hover:bg-soc-cardElevated border border-soc-border text-soc-textSecondary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {loading && devices.length === 0 ? (
        <div className="text-soc-textMuted text-xs p-4 text-center">Loading devices...</div>
      ) : devices.length === 0 ? (
        <div className="text-soc-textMuted text-xs p-4 text-center">
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                    selectedDevice?.id === device.id
                      ? 'bg-soc-cardElevated border border-primary/20 text-white font-bold'
                      : 'hover:bg-white/5 text-soc-textSecondary border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      device.status === 'ONLINE' ? 'bg-soc-success shadow-[0_0_6px_#22c55e]' : 'bg-slate-500'
                    }`} />
                    <span className="truncate">{device.name}</span>
                  </div>
                  <span className="text-[9px] text-soc-textMuted font-mono shrink-0 ml-2">
                    v{device.version || '?'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedDevice && (
            <div className="flex-1 bg-soc-card border border-soc-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-soc-textPrimary">{selectedDevice.name}</h4>
                  <p className="text-[10px] text-soc-textMuted">
                    Last heartbeat: {selectedDevice.lastHeartbeat
                      ? new Date(selectedDevice.lastHeartbeat).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedDevice.status === 'ONLINE'
                    ? 'bg-soc-success/10 text-soc-success border border-soc-success/20'
                    : 'bg-slate-500/10 text-soc-textMuted border border-slate-500/20'
                }`}>
                  {selectedDevice.status}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-soc-textMuted uppercase tracking-wider block mb-1">
                    Confidence Threshold
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={configValues.confidenceThreshold ?? 0.5}
                    onChange={(e) => updateConfigValue('confidenceThreshold', parseFloat(e.target.value))}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-soc-textMuted uppercase tracking-wider block mb-1">
                    Cooldown (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={configValues.cooldownSeconds ?? 10}
                    onChange={(e) => updateConfigValue('cooldownSeconds', parseInt(e.target.value))}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-soc-textMuted uppercase tracking-wider">
                    Alerts Enabled
                  </label>
                  <button
                    onClick={() => updateConfigValue('alertsEnabled', !(configValues.alertsEnabled ?? true))}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      (configValues.alertsEnabled ?? true) ? 'bg-primary' : 'bg-slate-600'
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
                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  {saveStatus === 'saving' ? 'Saving...' : 'Push Config to Edge'}
                </button>
                {saveStatus === 'success' && (
                  <span className="text-soc-success text-[10px] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Configuration pushed
                  </span>
                )}
                {saveStatus.startsWith('error') && (
                  <span className="text-soc-danger text-[10px] font-semibold">
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
