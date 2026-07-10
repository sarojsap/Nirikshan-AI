import { useState, useEffect } from 'react';
import { API } from '../config';

const SEVERITIES = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TYPES = ['', 'PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA'];
const PAGE_SIZE = 15;

export default function EdgeIncidents({ token, cameras, onLogout, onSelectIncident }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ severity: '', type: '', cameraId: '' });

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.type) params.set('type', filters.type);
    if (filters.cameraId) params.set('cameraId', filters.cameraId);
    return `${API.INCIDENTS}?${params.toString()}`;
  };

  const fetchIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(buildUrl(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onLogout?.(); return; }
      if (!res.ok) { setError('Failed to load local incidents'); return; }
      
      const body = await res.json();
      setIncidents(body.data || []);
      setTotal(body.pagination?.totalRecords || body.total || 0);
    } catch (err) {
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

  const severityBadge = (s) => {
    switch (s) {
      case 'CRITICAL': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'LOW': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const severityDot = (s) => {
    switch (s) {
      case 'CRITICAL': return 'bg-rose-500 shadow-[0_0_8px_#f43f5e]';
      case 'HIGH': return 'bg-orange-500 shadow-[0_0_8px_#f97316]';
      case 'MEDIUM': return 'bg-amber-500 shadow-[0_0_8px_#f59e0b]';
      case 'LOW': return 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Security & Crowd Alerts</h2>
          <p className="text-xs text-slate-400 mt-0.5">Browse, filter, and inspect historical detection logs and snapshots</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-4 bg-[#090f19] border border-[#162235] rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Severity</label>
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="bg-[#0d1625] border border-[#1b2a47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer min-w-[130px] font-semibold"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s} className="bg-[#090f19]">{s || 'All Severities'}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detection Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="bg-[#0d1625] border border-[#1b2a47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer min-w-[150px] font-semibold"
          >
            {TYPES.map((t) => (
              <option key={t} value={t} className="bg-[#090f19]">{t ? t.replace(/_/g, ' ') : 'All Types'}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Camera Feed</label>
          <select
            value={filters.cameraId}
            onChange={(e) => handleFilterChange('cameraId', e.target.value)}
            className="bg-[#0d1625] border border-[#1b2a47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer min-w-[180px] font-semibold"
          >
            <option value="" className="bg-[#090f19]">All Cameras</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#090f19]">{c.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => { setFilters({ severity: '', type: '', cameraId: '' }); setPage(1); }}
          className="self-end px-4 py-2 bg-white/5 hover:bg-white/10 border border-[#162235] text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all h-[38px] flex items-center justify-center"
        >
          Reset Filters
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl shadow-md">{error}</div>
      )}

      {loading && incidents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-[#090f19]/30 border border-[#162235] rounded-2xl py-24"><span className="text-slate-400 text-xs font-medium">Loading alerts...</span></div>
      ) : incidents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-[#090f19]/30 border border-[#162235] rounded-2xl py-24"><span className="text-slate-500 text-xs font-medium">No alerts recorded matching active filters.</span></div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onSelectIncident?.(inc)}
                className="flex items-center gap-4 bg-[#090f19] border border-[#162235] hover:border-violet-500/40 rounded-xl p-4 cursor-pointer transition-all shadow-md group hover:-translate-y-[1px]"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${severityDot(inc.severity)}`} />
                
                {inc.imageUrl && (
                  <div className="w-14 h-10 rounded-lg overflow-hidden border border-white/5 bg-black/30 shrink-0">
                    <img src={inc.imageUrl.startsWith('http') ? inc.imageUrl : `${API.BASE}${inc.imageUrl}`} alt="Snapshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white tracking-wide">{inc.type?.replace(/_/g, ' ') || 'ALERT'}</span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${severityBadge(inc.severity)}`}>
                      {inc.severity}
                    </span>
                    {inc.camera?.name && (
                      <span className="text-[10px] bg-violet-600/10 text-violet-400 border border-violet-500/15 px-2 py-0.5 rounded font-medium flex items-center gap-1 font-sans">
                        <span className="material-symbols-outlined text-xs">videocam</span>
                        {inc.camera.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate font-medium">{inc.description || 'No detection description available.'}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-slate-500 font-semibold font-mono flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-slate-600">schedule</span>
                      {inc.timestamp ? new Date(inc.timestamp).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-600 group-hover:text-white transition-colors text-lg">arrow_right_alt</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-[#090f19] border border-[#162235] rounded-2xl p-3 shadow-xl mt-2 shrink-0">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 bg-[#0c1524] hover:bg-[#121f36] disabled:opacity-30 disabled:cursor-not-allowed border border-[#162235] text-slate-300 hover:text-white rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all"
            >
              Previous
            </button>
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Page {page} of {totalPages} ({total} alerts)</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-[#0c1524] hover:bg-[#121f36] disabled:opacity-30 disabled:cursor-not-allowed border border-[#162235] text-slate-300 hover:text-white rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
