import { useState, useEffect } from 'react';
import { API } from '../config';

export default function SyncStatusBadge({ token, onLogout }) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`${API.SYNC}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onLogout?.(); return; }
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch {
      // Edge backend may be down
    }
  };

  if (!syncStatus || !syncStatus.cloudConfigured) {
    return null;
  }

  const total = syncStatus.total;
  const pending = syncStatus.pending;
  const failed = syncStatus.failed;
  const synced = syncStatus.synced;
  const cloudConfigured = syncStatus.cloudConfigured;
  const color = pending > 0 ? 'amber' : failed > 0 ? 'rose' : 'emerald';
  const indicatorColor = color === 'emerald' ? 'bg-emerald-400' : color === 'amber' ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className="px-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-white/5 text-slate-400 text-xs transition-all"
      >
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${indicatorColor} ${pending > 0 ? 'animate-pulse' : ''}`} />
          <span className="font-semibold">Cloud Sync</span>
        </div>
        <div className="flex gap-1.5">
          {pending > 0 && (
            <span className="bg-amber-600/10 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/20">
              {pending}
            </span>
          )}
          {failed > 0 && (
            <span className="bg-rose-600/10 text-rose-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-rose-500/20">
              {failed}
            </span>
          )}
        </div>
      </button>
      {expanded && (
        <div className="mx-3 mb-2 px-3 py-2 bg-[#0c1524] border border-[#162235] rounded-xl text-[10px] space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Total Incidents</span>
            <span className="text-white font-semibold">{total}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Synced</span>
            <span className="text-emerald-400 font-semibold">{synced}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Pending</span>
            <span className="text-amber-400 font-semibold">{pending}</span>
          </div>
          {failed > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Failed</span>
              <span className="text-rose-400 font-semibold">{failed}</span>
            </div>
          )}
          {syncStatus.edgeId && (
            <div className="flex justify-between text-slate-400 pt-1 border-t border-white/5 mt-1">
              <span>Edge ID</span>
              <span className="text-slate-300 font-mono text-[8px]">{syncStatus.edgeId.slice(0, 8)}...</span>
            </div>
          )}
          {!cloudConfigured && (
            <div className="text-amber-400 font-semibold">Cloud not configured</div>
          )}
        </div>
      )}
    </div>
  );
}
