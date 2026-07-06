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
      case 'CRITICAL': return 'bg-rose-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-amber-500';
      case 'LOW': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Incidents</h2>
        <p className="text-xs text-slate-400 mt-0.5">Browse and filter synced incidents from all edge devices</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-[#090f19] border border-[#162235] rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Severity</label>
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="bg-[#0d1625] border border-[#1b2a47] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s} className="bg-[#090f19]">{s || 'All Severities'}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="bg-[#0d1625] border border-[#1b2a47] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
          >
            {TYPES.map((t) => (
              <option key={t} value={t} className="bg-[#090f19]">{t ? t.replace(/_/g, ' ') : 'All Types'}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">From</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="bg-[#0d1625] border border-[#1b2a47] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">To</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="bg-[#0d1625] border border-[#1b2a47] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <button
          onClick={() => { setFilters({ severity: '', type: '', startDate: '', endDate: '' }); setPage(1); }}
          className="self-end px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-[#162235] text-slate-400 hover:text-white rounded-xl text-[10px] font-semibold transition-all"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{error}</div>
      )}

      {loading && incidents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"><span className="text-slate-400 text-xs">Loading incidents...</span></div>
      ) : incidents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"><span className="text-slate-500 text-xs">No incidents match your filters.</span></div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onSelectIncident?.(inc)}
                className="flex items-center gap-4 bg-[#0d1624] border border-[#162235] hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all"
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${severityDot(inc.severity)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">{inc.type?.replace(/_/g, ' ') || 'Alert'}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      inc.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400' :
                      inc.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                      inc.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>{inc.severity}</span>
                    {inc.cameraName && (
                      <span className="text-[9px] text-slate-500 font-mono">{inc.cameraName}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{inc.description || '—'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] text-slate-600 font-mono">
                      {inc.timestamp ? new Date(inc.timestamp).toLocaleString() : '—'}
                    </span>
                    {inc.edgeDevice && (
                      <span className="text-[9px] text-slate-600">Device: {inc.edgeDevice.name || inc.edgeDeviceId}</span>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-600 text-sm">chevron_right</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-[#090f19] border border-[#162235] rounded-2xl p-3 shadow-xl">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-[#162235] text-slate-300 rounded-xl text-[10px] font-semibold transition-all"
            >
              Previous
            </button>
            <span className="text-[10px] text-slate-500 font-mono">Page {page} of {totalPages} ({total} total)</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-[#162235] text-slate-300 rounded-xl text-[10px] font-semibold transition-all"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
