import { useState, useEffect } from 'react';
import { CLOUD_API } from '../config';

const SEVERITIES = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const TYPES = ['', 'PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA'];
const PAGE_SIZE = 20;

export default function CloudIncidents({ token, onLogout, onSelectIncident }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ severity: '', type: '', startDate: '', endDate: '' });

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.type) params.set('type', filters.type);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    return `${CLOUD_API.INCIDENTS}?${params.toString()}`;
  };

  const fetchIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(buildUrl(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onLogout?.(); return; }
      if (!res.ok) { setError('Failed to load incidents'); return; }
      const body = await res.json();
      const data = body.data ?? body;
      setIncidents(Array.isArray(data) ? data : []);
      setTotal(body.total ?? body.pagination?.total ?? data.length);
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [token, page, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const severityDot = (s) => {
    switch (s) {
      case 'CRITICAL': return 'bg-soc-danger';
      case 'HIGH': return 'bg-soc-warning';
      case 'MEDIUM': return 'bg-soc-warning';
      case 'LOW': return 'bg-soc-success';
      default: return 'bg-slate-505';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
      <div>
        <h2 className="text-xl font-bold text-soc-textPrimary tracking-tight">Incidents</h2>
        <p className="text-xs text-soc-textMuted mt-0.5">Browse and filter synced incidents from all edge devices</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-soc-sidebar border border-soc-border rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-soc-textMuted uppercase tracking-wider">Severity</label>
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="bg-soc-card border border-soc-border rounded-xl px-3 py-1.5 text-xs text-soc-textPrimary focus:outline-none focus:border-primary cursor-pointer min-w-[130px] font-semibold"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s} className="bg-soc-sidebar">{s || 'All Severities'}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-soc-textMuted uppercase tracking-wider">Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="bg-soc-card border border-soc-border rounded-xl px-3 py-1.5 text-xs text-soc-textPrimary focus:outline-none focus:border-primary cursor-pointer min-w-[150px] font-semibold"
          >
            {TYPES.map((t) => (
              <option key={t} value={t} className="bg-soc-sidebar">{t ? t.replace(/_/g, ' ') : 'All Types'}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-soc-textMuted uppercase tracking-wider">From</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="bg-soc-card border border-soc-border rounded-xl px-3 py-1.5 text-xs text-soc-textPrimary focus:outline-none focus:border-primary cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-soc-textMuted uppercase tracking-wider">To</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="bg-soc-card border border-soc-border rounded-xl px-3 py-1.5 text-xs text-soc-textPrimary focus:outline-none focus:border-primary cursor-pointer"
          />
        </div>

        <button
          onClick={() => { setFilters({ severity: '', type: '', startDate: '', endDate: '' }); setPage(1); }}
          className="self-end px-4 py-1.5 bg-soc-card hover:bg-soc-cardElevated border border-soc-border text-soc-textSecondary hover:text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer h-[34px] flex items-center justify-center"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="p-3 bg-soc-danger/10 border border-soc-danger/20 text-soc-danger text-xs rounded-xl">{error}</div>
      )}

      {loading && incidents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"><span className="text-soc-textMuted text-xs animate-pulse">Loading incidents...</span></div>
      ) : incidents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"><span className="text-soc-textMuted text-xs">No incidents match your filters.</span></div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onSelectIncident?.(inc)}
                className="flex items-center gap-4 bg-soc-sidebar border border-soc-border hover:border-primary/45 rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-[1px] shadow-sm group"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${severityDot(inc.severity)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-soc-textPrimary">{inc.type?.replace(/_/g, ' ') || 'Alert'}</span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                      inc.severity === 'CRITICAL' ? 'bg-soc-danger/10 text-soc-danger border border-soc-danger/20' :
                      inc.severity === 'HIGH' ? 'bg-soc-warning/10 text-soc-warning border border-soc-warning/20' :
                      inc.severity === 'MEDIUM' ? 'bg-soc-warning/10 text-soc-warning border border-soc-warning/20' :
                      'bg-soc-success/10 text-soc-success border border-soc-success/20'
                    }`}>{inc.severity}</span>
                    {inc.cameraName && (
                      <span className="text-[9px] text-soc-textMuted font-mono">{inc.cameraName}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-soc-textSecondary mt-0.5 truncate font-medium">{inc.description || '—'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] text-soc-textMuted font-semibold font-mono flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-soc-textMuted">schedule</span>
                      {inc.timestamp ? new Date(inc.timestamp).toLocaleString() : '—'}
                    </span>
                    {inc.edgeDevice && (
                      <span className="text-[9px] text-soc-textMuted font-semibold">Device: {inc.edgeDevice.name || inc.edgeDeviceId}</span>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined text-soc-textMuted group-hover:text-white transition-colors text-sm">chevron_right</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-soc-sidebar border border-soc-border rounded-2xl p-3 shadow-xl mt-2 shrink-0">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-1.5 bg-soc-card hover:bg-soc-cardElevated disabled:opacity-30 disabled:cursor-not-allowed border border-soc-border text-soc-textSecondary hover:text-white rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer"
            >
              Previous
            </button>
            <span className="text-[10px] text-soc-textMuted font-mono font-bold uppercase tracking-wider">Page {page} of {totalPages} ({total} total)</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-1.5 bg-soc-card hover:bg-soc-cardElevated disabled:opacity-30 disabled:cursor-not-allowed border border-soc-border text-soc-textSecondary hover:text-white rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
