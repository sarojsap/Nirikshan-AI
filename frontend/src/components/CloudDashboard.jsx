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
    } catch {
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
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 animate-pulse">Synchronizing Cloud Command Center...</p>
      </div>
    );
  }

  const severityConfig = {
    CRITICAL: {
      bar: 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_10px_rgba(244,63,94,0.4)]',
      pill: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
    },
    HIGH: {
      bar: 'bg-gradient-to-r from-orange-500 to-amber-600 shadow-[0_0_10px_rgba(249,115,22,0.4)]',
      pill: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
    },
    MEDIUM: {
      bar: 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_10px_rgba(251,191,36,0.3)]',
      pill: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
    },
    LOW: {
      bar: 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(52,211,153,0.3)]',
      pill: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
    },
  };

  const incidentTotal = summary?.total ?? 0;
  const bySeverity = summary?.bySeverity ?? [];
  const byType = summary?.byType ?? [];
  const recentIncidents = summary?.recent ?? [];

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0d1627] via-[#101e38] to-[#0d1627] border border-[#1b2b48] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Cloud Security Overview</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium">Aggregated real-time intelligence & incident analytics across edge nodes</p>
        </div>
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#162540] hover:bg-[#1f3358] border border-[#263b63] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2.5 shadow-lg">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="group bg-gradient-to-br from-[#111a2d] to-[#0c1322] border border-[#1b2a47] hover:border-rose-500/40 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-all" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Incidents</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">{incidentTotal.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-500/5 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <span className="material-symbols-outlined text-xs text-rose-400">shield_with_house</span>
            <span>Recorded across all connected sites</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="group bg-gradient-to-br from-[#111a2d] to-[#0c1322] border border-[#1b2a47] hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Active Edge Devices</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">{devices.length}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">devices</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>100% Operational & Reporting</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="group bg-gradient-to-br from-[#111a2d] to-[#0c1322] border border-[#1b2a47] hover:border-amber-500/40 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Alert Categories</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">{byType.length}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/5 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">category</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <span className="material-symbols-outlined text-xs text-amber-400">equalizer</span>
            <span>Intrusion, Crowd, Fire & Violence</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="group bg-gradient-to-br from-[#111a2d] to-[#0c1322] border border-[#1b2a47] hover:border-sky-500/40 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition-all" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Sync Interval</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">30s</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/5 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.15)] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl animate-spin-slow">sync</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-sky-400 font-medium">
            <span className="material-symbols-outlined text-xs">cloud_done</span>
            <span>Automated Edge Telemetry</span>
          </div>
        </div>
      </div>

      {/* Analytics Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] rounded-2xl p-6 shadow-xl relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-[#182640] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400 text-lg">shield_alert</span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Incidents by Severity</h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-[#16243d] px-2.5 py-1 rounded-lg border border-[#203456]">
                {bySeverity.length} Severity Levels
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {bySeverity.length === 0 ? (
                <div className="text-slate-500 text-xs text-center py-6">No severity telemetry recorded.</div>
              ) : (
                bySeverity.map((s) => {
                  const cfg = severityConfig[s.severity] || severityConfig.MEDIUM;
                  const pct = incidentTotal > 0 ? Math.round((Number(s.count) / incidentTotal) * 100) : 0;
                  return (
                    <div key={s.severity} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className="font-bold text-white tracking-wide">{s.severity}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-400 text-[10px] font-semibold">{pct}%</span>
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md border ${cfg.pill}`}>
                            {s.count}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-[#090f1a] border border-[#16243d] rounded-full overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.bar}`}
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] rounded-2xl p-6 shadow-xl relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-[#182640] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-lg">donut_small</span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Incidents by Category</h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-[#16243d] px-2.5 py-1 rounded-lg border border-[#203456]">
                {byType.length} Threat Types
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {byType.length === 0 ? (
                <div className="text-slate-500 text-xs text-center py-6">No type telemetry recorded.</div>
              ) : (
                byType.map((t) => {
                  const pct = incidentTotal > 0 ? Math.round((Number(t.count) / incidentTotal) * 100) : 0;
                  return (
                    <div key={t.type} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                          <span className="font-bold text-white tracking-wide">{t.type.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-400 text-[10px] font-semibold">{pct}%</span>
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                            {t.count}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-[#090f1a] border border-[#16243d] rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all duration-700 ease-out"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Incidents Stream */}
      <div className="bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-5 border-b border-[#182640] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-400 text-lg">history_toggle_off</span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Cloud Alerts</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider bg-[#16243d] px-2.5 py-1 rounded-lg border border-[#203456]">
            {recentIncidents.length} Streamed Logs
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {recentIncidents.length === 0 ? (
            <div className="text-center py-10 bg-[#090f19]/60 border border-[#162235] rounded-xl">
              <span className="material-symbols-outlined text-slate-600 text-3xl mb-2">verified_user</span>
              <p className="text-slate-400 text-xs font-semibold">No recent security alerts recorded.</p>
              <p className="text-slate-500 text-[10px] mt-0.5">System status normal across all edge nodes.</p>
            </div>
          ) : (
            recentIncidents.map((inc) => {
              const cfg = severityConfig[inc.severity] || severityConfig.MEDIUM;
              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident?.(inc)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1626] hover:bg-[#121f38] border border-[#1b2a47] hover:border-primary/50 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md group"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span className={`w-3 h-3 rounded-full shrink-0 mt-1 ${cfg.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-extrabold text-white tracking-wide">{inc.type?.replace(/_/g, ' ') || 'Incident Alert'}</span>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${cfg.pill}`}>
                          {inc.severity}
                        </span>
                        {(inc.cameraName || inc.cameraId) && (
                          <span className="text-[10px] text-slate-400 font-mono bg-[#16243d] px-2 py-0.5 rounded border border-[#203456] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px] text-slate-400">videocam</span>
                            {inc.cameraName || inc.cameraId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-1 font-medium leading-relaxed">{inc.description || 'Threat detected by edge vision node.'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#182640]">
                    <span className="text-[10px] text-slate-400 font-mono font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-slate-500">schedule</span>
                      {inc.timestamp ? new Date(inc.timestamp).toLocaleString() : '—'}
                    </span>
                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary group-hover:translate-x-1 transition-all text-sm">
                      chevron_right
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
