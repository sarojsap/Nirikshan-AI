import { useState, useEffect } from 'react';
import { CLOUD_API } from '../config';

export default function CloudDashboard({ token, onLogout, onSelectIncident }) {
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

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
        setError('Failed to load summary');
      }
      if (devicesRes.ok) {
        const d = await devicesRes.json();
        setDevices(d.data || d);
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading && !summary) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  const severityStyles = {
    CRITICAL: { bar: 'bg-rose-500', pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    HIGH: { bar: 'bg-amber-500', pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    MEDIUM: { bar: 'bg-amber-400', pill: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
    LOW: { bar: 'bg-emerald-400', pill: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' },
  };

  const incidentTotal = summary?.total ?? 0;
  const bySeverity = summary?.bySeverity ?? [];
  const byType = summary?.byType ?? [];
  const recentIncidents = summary?.recent ?? [];

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 pb-6 animate-fade-in">
      {/* Minimal Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-lg font-bold text-white tracking-tight">Cloud Overview</h2>
        </div>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#0e1726] hover:bg-[#142136] border border-[#1b2a45] text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl animate-fade-in">
          {error}
        </div>
      )}

      {/* 4 Minimal Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b1320] border border-[#16233b] hover:border-slate-700 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-lg animate-fade-in-up">
          <p className="text-[11px] font-semibold text-slate-400 mb-2">Total Incidents</p>
          <p className="text-3xl font-extrabold text-white">{incidentTotal.toLocaleString()}</p>
        </div>

        <div className="bg-[#0b1320] border border-[#16233b] hover:border-slate-700 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-lg animate-fade-in-up delay-100">
          <p className="text-[11px] font-semibold text-slate-400 mb-2">Active Devices</p>
          <p className="text-3xl font-extrabold text-white">{devices.length}</p>
        </div>

        <div className="bg-[#0b1320] border border-[#16233b] hover:border-slate-700 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-lg animate-fade-in-up delay-200">
          <p className="text-[11px] font-semibold text-slate-400 mb-2">Threat Types</p>
          <p className="text-3xl font-extrabold text-white">{byType.length}</p>
        </div>

        <div className="bg-[#0b1320] border border-[#16233b] hover:border-slate-700 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-lg animate-fade-in-up delay-300">
          <p className="text-[11px] font-semibold text-slate-400 mb-2">Sync Interval</p>
          <p className="text-3xl font-extrabold text-white">30s</p>
        </div>
      </div>

      {/* Analytics Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity */}
        <div className="bg-[#0b1320] border border-[#16233b] rounded-2xl p-5 shadow-lg animate-fade-in-up">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Severity Breakdown</h3>
          <div className="flex flex-col gap-3.5">
            {bySeverity.length === 0 ? (
              <p className="text-slate-500 text-xs py-2">No severity data available.</p>
            ) : (
              bySeverity.map((s) => {
                const style = severityStyles[s.severity] || severityStyles.MEDIUM;
                const pct = incidentTotal > 0 ? Math.round((Number(s.count) / incidentTotal) * 100) : 0;
                return (
                  <div key={s.severity} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-white font-bold text-[11px]">{s.severity}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px]">{pct}%</span>
                        <span className="text-xs font-bold text-white font-mono">{s.count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#070d17] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${style.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-[#0b1320] border border-[#16233b] rounded-2xl p-5 shadow-lg animate-fade-in-up delay-100">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Threat Categories</h3>
          <div className="flex flex-col gap-3.5">
            {byType.length === 0 ? (
              <p className="text-slate-500 text-xs py-2">No threat category data available.</p>
            ) : (
              byType.map((t) => {
                const pct = incidentTotal > 0 ? Math.round((Number(t.count) / incidentTotal) * 100) : 0;
                return (
                  <div key={t.type} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-white font-bold text-[11px]">{t.type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px]">{pct}%</span>
                        <span className="text-xs font-bold text-white font-mono">{t.count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#070d17] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Alerts Feed */}
      <div className="bg-[#0b1320] border border-[#16233b] rounded-2xl p-5 shadow-lg animate-fade-in-up delay-200">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Recent Alerts</h3>
        <div className="flex flex-col gap-2">
          {recentIncidents.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-6">No recent security alerts.</p>
          ) : (
            recentIncidents.map((inc) => {
              const style = severityStyles[inc.severity] || severityStyles.MEDIUM;
              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident?.(inc)}
                  className="flex items-center justify-between gap-4 bg-[#080e18] hover:bg-[#0e1726] border border-[#142036] hover:border-slate-700 rounded-xl p-3.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider shrink-0 ${style.pill}`}>
                      {inc.severity}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{inc.type?.replace(/_/g, ' ') || 'Alert'}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">{inc.description || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {(inc.cameraName || inc.cameraId) && (
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">{inc.cameraName || inc.cameraId}</span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">
                      {inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
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
