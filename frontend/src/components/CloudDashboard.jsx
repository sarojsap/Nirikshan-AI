import { useState, useEffect } from 'react';
import { CLOUD_API } from '../config';

export default function CloudDashboard({ token, onLogout, onSelectIncident }) {
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [summaryRes, devicesRes] = await Promise.all([
        fetch(CLOUD_API.SUMMARY, { headers }),
        fetch(CLOUD_API.DEVICES, { headers }),
      ]);
      if (summaryRes.status === 401 || devicesRes.status === 401) { onLogout?.(); return; }
      if (summaryRes.ok) {
        const s = await summaryRes.json();
        setSummary(s.data || s);
      } else {
        setError('Failed to load dashboard summary');
      }
      if (devicesRes.ok) {
        const d = await devicesRes.json();
        setDevices(d.data || d);
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading && !summary) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 text-xs">Loading dashboard...</div>
      </div>
    );
  }

  const severityColors = {
    CRITICAL: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
    HIGH: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
    MEDIUM: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
    LOW: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  };

  const incidentTotal = summary?.total ?? 0;
  const bySeverity = summary?.bySeverity ?? [];
  const byType = summary?.byType ?? [];
  const recentIncidents = summary?.recent ?? [];

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Cloud Dashboard</h2>
        <p className="text-xs text-slate-400 mt-0.5">Aggregated incident overview across all edge devices</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{error}</div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <span className="material-symbols-outlined text-lg">warning</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Incidents</p>
              <p className="text-2xl font-bold text-white">{incidentTotal}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-lg">devices</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Devices</p>
              <p className="text-2xl font-bold text-white">{devices.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-lg">category</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Alert Types</p>
              <p className="text-2xl font-bold text-white">{byType.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <span className="material-symbols-outlined text-lg">schedule</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Last Sync</p>
              <p className="text-lg font-bold text-white">30s</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Incidents by Severity</h3>
          <div className="flex flex-col gap-3">
            {bySeverity.length === 0 ? (
              <p className="text-slate-500 text-xs">No data</p>
            ) : (
              bySeverity.map((s) => {
                const colors = severityColors[s.severity] || severityColors.MEDIUM;
                const pct = incidentTotal > 0 ? Math.round((Number(s.count) / incidentTotal) * 100) : 0;
                return (
                  <div key={s.severity} className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold w-16 ${colors.text}`}>{s.severity}</span>
                    <div className="flex-1 h-2 bg-[#0c1524] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors.bg.replace('/10', '/80')}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white w-8 text-right">{s.count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Incidents by Type</h3>
          <div className="flex flex-col gap-3">
            {byType.length === 0 ? (
              <p className="text-slate-500 text-xs">No data</p>
            ) : (
              byType.map((t) => {
                const pct = incidentTotal > 0 ? Math.round((Number(t.count) / incidentTotal) * 100) : 0;
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-300 w-24 truncate">{t.type.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-2 bg-[#0c1524] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500/60" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white w-8 text-right">{t.count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#090f19] border border-[#162235] rounded-2xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Incidents</h3>
          <span className="text-[10px] text-slate-500 font-mono">{incidentTotal} total</span>
        </div>
        <div className="flex flex-col gap-2">
          {recentIncidents.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">No incidents recorded yet.</p>
          ) : (
            recentIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onSelectIncident?.(inc)}
                className="flex items-center gap-4 bg-[#0d1624] border border-[#162235] hover:border-slate-600 rounded-xl p-3 cursor-pointer transition-all"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  inc.severity === 'CRITICAL' ? 'bg-rose-500' :
                  inc.severity === 'HIGH' ? 'bg-orange-500' :
                  inc.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{inc.type?.replace(/_/g, ' ') || 'Alert'}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{inc.cameraName || inc.cameraId || '—'}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{inc.description}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {inc.timestamp ? new Date(inc.timestamp).toLocaleString() : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
