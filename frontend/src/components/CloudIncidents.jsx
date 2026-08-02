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
    CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    MEDIUM: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
    LOW: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
  };

  const hasActiveFilters = Boolean(filters.severity || filters.type || filters.startDate || filters.endDate);

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 pb-6 animate-fade-in">
      {/* Minimal Header */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-lg font-bold text-white tracking-tight">Incident Logs</h2>
        <span className="text-xs font-mono font-semibold text-slate-400 bg-[#0e1726] border border-[#1b2a45] px-3 py-1 rounded-xl">
          {total} Logs
        </span>
      </div>

      {/* Minimal Filter Bar */}
      <div className="bg-[#0b1320] border border-[#16233b] rounded-2xl p-4 shadow-lg flex flex-wrap items-center gap-3">
        <select
          value={filters.severity}
          onChange={(e) => handleFilterChange('severity', e.target.value)}
          className="bg-[#080e18] border border-[#142036] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-medium cursor-pointer"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s} className="bg-[#080e18]">
              {s || 'All Severities'}
            </option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="bg-[#080e18] border border-[#142036] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-medium cursor-pointer"
        >
          {TYPES.map((t) => (
            <option key={t} value={t} className="bg-[#080e18]">
              {t ? t.replace(/_/g, ' ') : 'All Threat Types'}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          className="bg-[#080e18] border border-[#142036] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-primary font-mono cursor-pointer"
        />

        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          className="bg-[#080e18] border border-[#142036] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-primary font-mono cursor-pointer"
        />

        {hasActiveFilters && (
          <button
            onClick={() => { setFilters({ severity: '', type: '', startDate: '', endDate: '' }); setPage(1); }}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Main List */}
      {loading && incidents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">Loading logs...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-12 bg-[#0b1320] border border-[#16233b] rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">No incidents match your filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {incidents.map((inc) => {
            const style = severityStyles[inc.severity] || severityStyles.MEDIUM;
            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident?.(inc)}
                className="flex items-center justify-between gap-4 bg-[#080e18] hover:bg-[#0e1726] border border-[#142036] hover:border-slate-700 rounded-xl p-3.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider shrink-0 ${style}`}>
                    {inc.severity}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate">{inc.type?.replace(/_/g, ' ') || 'Alert'}</p>
                      {inc.cameraName && <span className="text-[10px] text-slate-500 font-mono">({inc.cameraName})</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">{inc.description || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {inc.timestamp ? new Date(inc.timestamp).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between bg-[#0b1320] border border-[#16233b] rounded-xl p-3 mt-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-[#0e1726] hover:bg-[#142136] disabled:opacity-30 disabled:cursor-not-allowed border border-[#1b2a45] text-slate-300 rounded-lg text-xs font-medium transition-all"
            >
              Previous
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-[#0e1726] hover:bg-[#142136] disabled:opacity-30 disabled:cursor-not-allowed border border-[#1b2a45] text-slate-300 rounded-lg text-xs font-medium transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
