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
  const indicatorColor = color === 'emerald' ? 'bg-soc-success' : color === 'amber' ? 'bg-soc-warning' : 'bg-soc-danger';

  return (
    <div className="px-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-white/5 text-soc-textMuted text-xs transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${indicatorColor} ${pending > 0 ? 'animate-pulse' : ''}`} />
          <span className="font-semibold">Cloud Sync</span>
        </div>
        <div className="flex gap-1.5">
          {pending > 0 && (
            <span className="bg-soc-warning/10 text-soc-warning text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-soc-warning/20">
              {pending}
            </span>
          )}
          {failed > 0 && (
            <span className="bg-soc-danger/10 text-soc-danger text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-soc-danger/20">
              {failed}
            </span>
          )}
        </div>
      </button>
      {expanded && (
        <div className="mx-3 mb-2 px-3 py-2 bg-soc-sidebar border border-soc-border rounded-xl text-[10px] space-y-1">
          <div className="flex justify-between text-soc-textMuted font-medium">
            <span>Total Incidents</span>
            <span className="text-soc-textPrimary font-bold">{total}</span>
          </div>
          <div className="flex justify-between text-soc-textMuted font-medium">
            <span>Synced</span>
            <span className="text-soc-success font-bold">{synced}</span>
          </div>
          <div className="flex justify-between text-soc-textMuted font-medium">
            <span>Pending</span>
            <span className="text-soc-warning font-bold">{pending}</span>
          </div>
          {failed > 0 && (
            <div className="flex justify-between text-soc-textMuted font-medium">
              <span>Failed</span>
              <span className="text-soc-danger font-bold">{failed}</span>
            </div>
          )}
          {syncStatus.edgeId && (
            <div className="flex justify-between text-soc-textMuted pt-1 border-t border-soc-border mt-1">
              <span>Edge ID</span>
              <span className="text-soc-textSecondary font-mono text-[8px]">{syncStatus.edgeId.slice(0, 8)}...</span>
            </div>
          )}
          {!cloudConfigured && (
            <div className="text-soc-warning font-bold">Cloud not configured</div>
          )}
        </div>
      )}
    </div>
  );
}
