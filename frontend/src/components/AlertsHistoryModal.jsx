import { useState, useEffect, useCallback } from 'react';
import { API } from '../config';

export default function AlertsHistoryModal({ isOpen, onClose, token, onLogout, onSelectIncident }) {
  const [incidents, setIncidents] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 10;

  const fetchAlerts = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API.INCIDENTS}?page=${pageNum}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        const result = await res.json();
        setIncidents(result.data || []);
        setPage(result.pagination.currentPage);
        setTotalPages(result.pagination.totalPages);
        setTotalRecords(result.pagination.totalRecords);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load historical alerts.');
      }
    } catch (err) {
      setError('Connection error. Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts(1);
    }
  }, [isOpen, fetchAlerts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[220] p-4 font-sans">
      <div className="bg-[#090f19] border border-[#162235] w-full max-w-5xl rounded-2xl flex flex-col shadow-2xl relative overflow-hidden h-[80vh] max-h-[700px]">
        
        <div className="p-5 border-b border-[#162235] bg-[#0c1524] flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Historical Alerts Log</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Review all recorded perimeter intrusions and crowd limit notifications</p>
          </div>
          <button 
            className="text-slate-400 hover:text-white text-xl font-bold bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center border border-white/5 transition-all"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs font-semibold">Loading historical alerts...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-slate-500">
              <span className="material-symbols-outlined text-4xl">notifications_off</span>
              <p className="text-xs">No historical alerts found in database logs.</p>
            </div>
          ) : (
            <div className="w-full flex flex-col min-w-[700px]">
              <div className="grid grid-cols-12 text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-2.5 border-b border-[#162235] px-4 shrink-0">
                <span className="col-span-2">Event</span>
                <span className="col-span-2">Severity</span>
                <span className="col-span-2">Camera</span>
                <span className="col-span-4">Details / Description</span>
                <span className="col-span-2">Timestamp</span>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                {incidents.map((incident) => {
                  const isCritical = incident.severity === 'CRITICAL';
                  const isWarning = incident.severity === 'WARNING' || incident.severity === 'HIGH' || incident.type.includes('CROWD');
                  let sevBadgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                  
                  if (isCritical) {
                    sevBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                  } else if (isWarning) {
                    sevBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  }

                  return (
                    <div 
                      key={incident.id} 
                      onClick={() => { if (onSelectIncident) onSelectIncident(incident); }}
                      className="grid grid-cols-12 items-center py-3 border-b border-[#162235]/40 hover:bg-white/5 transition-all rounded-xl px-4 text-xs text-slate-300 cursor-pointer"
                    >
                      <span className="col-span-2 font-bold text-white tracking-wide truncate">{incident.type}</span>
                      <span className="col-span-2">
                        <span className={`border px-2 py-0.5 rounded-full text-[9px] font-bold ${sevBadgeColor}`}>
                          {incident.severity}
                        </span>
                      </span>
                      <span className="col-span-2 font-semibold text-slate-400 truncate">
                        {incident.camera ? incident.camera.name : incident.location || 'Surveillance'}
                      </span>
                      <span className="col-span-4 text-slate-300 leading-relaxed pr-4 truncate">{incident.description}</span>
                      <span className="col-span-2 font-mono text-[10px] text-slate-500">
                        {new Date(incident.timestamp || incident.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#162235] bg-[#0c1524] flex justify-between items-center shrink-0 text-xs">
          <span className="text-slate-500 font-semibold">
            Total Logs: <span className="text-slate-300 font-bold">{totalRecords}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              disabled={page <= 1 || loading}
              onClick={() => fetchAlerts(page - 1)}
              className="px-3 py-1.5 bg-[#121c2e] hover:bg-[#1a2942] disabled:opacity-40 text-slate-300 hover:text-white border border-[#1f2f4c] rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-slate-400 font-mono font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => fetchAlerts(page + 1)}
              className="px-3 py-1.5 bg-[#121c2e] hover:bg-[#1a2942] disabled:opacity-40 text-slate-300 hover:text-white border border-[#1f2f4c] rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
