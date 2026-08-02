import { useState, useEffect } from 'react';
import { CLOUD_API } from '../config';

const SEVERITIES = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const TYPES = ['', 'PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA', 'FIRE', 'WEAPON', 'VIOLENCE'];
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
      setTotal(body.total ?? body.pagination?.total ?? (Array.isArray(data) ? data.length : 0));
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

  const severityStyles = {
    CRITICAL: {
      pill: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
    },
    HIGH: {
      pill: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
    },
    MEDIUM: {
      pill: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
    },
    LOW: {
      pill: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
    },
  };

  const hasActiveFilters = Boolean(filters.severity || filters.type || filters.startDate || filters.endDate);

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0d1627] via-[#101e38] to-[#0d1627] border border-[#1b2b48] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-rose-400 text-xl">dataset</span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Synced Incident Logs</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium">Browse, query, and audit security events collected from edge sites</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono font-bold text-slate-300 bg-[#162540] border border-[#263b63] px-3 py-1.5 rounded-xl shadow-md">
            {total} Total Logs
          </span>
        </div>
      </div>

      {/* Filter Control Toolbar */}
      <div className="bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] rounded-2xl p-5 shadow-xl flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-slate-400">tune</span> Severity
          </label>
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="bg-[#0d1626] border border-[#1b2a47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-semibold cursor-pointer shadow-inner"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s} className="bg-[#0d1626] text-white">
                {s || 'All Severities'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[170px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-slate-400">category</span> Threat Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="bg-[#0d1626] border border-[#1b2a47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-semibold cursor-pointer shadow-inner"
          >
            {TYPES.map((t) => (
              <option key={t} value={t} className="bg-[#0d1626] text-white">
                {t ? t.replace(/_/g, ' ') : 'All Threat Types'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-slate-400">calendar_today</span> From Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="bg-[#0d1626] border border-[#1b2a47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary cursor-pointer shadow-inner font-mono"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-slate-400">event</span> To Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="bg-[#0d1626] border border-[#1b2a47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary cursor-pointer shadow-inner font-mono"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => { setFilters({ severity: '', type: '', startDate: '', endDate: '' }); setPage(1); }}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 h-[38px]"
          >
            <span className="material-symbols-outlined text-sm">filter_alt_off</span>
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2 shadow-lg">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading && incidents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] rounded-2xl">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-semibold animate-pulse">Loading incident records...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] rounded-2xl text-center">
          <span className="material-symbols-outlined text-slate-600 text-4xl mb-3">search_off</span>
          <p className="text-sm font-bold text-white mb-1">No Incidents Found</p>
          <p className="text-xs text-slate-400 max-w-sm">No security logs match your current search filters. Try adjusting your severity or date criteria.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {incidents.map((inc) => {
              const style = severityStyles[inc.severity] || severityStyles.MEDIUM;
              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident?.(inc)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] hover:border-primary/50 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-lg group relative overflow-hidden"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <span className={`w-3 h-3 rounded-full shrink-0 mt-1 ${style.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap mb-1">
                        <span className="text-sm font-extrabold text-white tracking-wide">{inc.type?.replace(/_/g, ' ') || 'Security Alert'}</span>
                        <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded border uppercase tracking-wider ${style.pill}`}>
                          {inc.severity}
                        </span>
                        {inc.cameraName && (
                          <span className="text-[10px] text-slate-300 font-mono bg-[#16243d] px-2 py-0.5 rounded border border-[#203456] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px] text-slate-400">videocam</span>
                            {inc.cameraName}
                          </span>
                        )}
                        {inc.edgeDevice && (
                          <span className="text-[10px] text-slate-400 font-mono bg-[#16243d] px-2 py-0.5 rounded border border-[#203456] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px] text-slate-400">dns</span>
                            {inc.edgeDevice.name || inc.edgeDeviceId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">{inc.description || 'No detailed log summary provided.'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#182640]">
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
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between bg-gradient-to-br from-[#101827] to-[#0b121e] border border-[#1b2944] rounded-2xl p-4 shadow-xl mt-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#162540] hover:bg-[#1f3358] disabled:opacity-30 disabled:cursor-not-allowed border border-[#263b63] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
              <span>Previous</span>
            </button>
            <span className="text-xs text-slate-400 font-mono font-bold">
              Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span>
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#162540] hover:bg-[#1f3358] disabled:opacity-30 disabled:cursor-not-allowed border border-[#263b63] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer"
            >
              <span>Next</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
