export default function SnapshotViewer({ incident, onClose }) {
  if (!incident) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250] p-4 font-sans">
      <div className="bg-[#090f19] border border-[#162235] w-full max-w-4xl rounded-2xl flex flex-col md:flex-row shadow-2xl relative overflow-hidden h-[85vh] max-h-[600px]">
        
        <button 
          className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center z-50 text-xl font-bold transition-colors border border-white/10" 
          onClick={onClose}
        >
          ×
        </button>

        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden h-1/2 md:h-full group">
          {incident.imageUrl ? (
            <img 
              src={incident.imageUrl} 
              alt="Incident Snapshot" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-8">
              <span className="material-symbols-outlined text-slate-600 text-5xl mb-2">image_not_supported</span>
              <p className="text-slate-400 text-xs">No snapshot image available for this alert.</p>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-[#090f19]/80 backdrop-blur-md px-3 py-1.5 border border-white/10 rounded-lg text-[9px] font-bold text-slate-300 font-mono flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
            <span>TELEMETRY OVERLAY FRAME</span>
          </div>
        </div>

        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[#162235] bg-[#0c1524] p-6 flex flex-col justify-between shrink-0 h-1/2 md:h-full overflow-y-auto">
          <div className="flex flex-col gap-5">
            <div>
              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                {incident.severity || 'CRITICAL'}
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-2.5">{incident.type}</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {incident.id}</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Detection Location</span>
                <div className="flex items-center gap-1.5 text-xs text-white mt-0.5">
                  <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                  <span>{incident.camera ? incident.camera.location : incident.location || 'Surveillance Zone'}</span>
                </div>
                {incident.camera && (
                  <span className="text-[10px] text-slate-400 font-medium font-sans mt-0.5">
                    Camera: {incident.camera.name}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Alert Details</span>
                <p className="text-xs text-slate-300 leading-normal mt-0.5">{incident.description}</p>
              </div>

              <div className="flex flex-col gap-1 bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Incident Timestamp</span>
                <div className="flex items-center gap-1.5 text-xs text-white mt-0.5 font-mono">
                  <span className="material-symbols-outlined text-sm text-slate-400 font-sans">schedule</span>
                  <span>{new Date(incident.timestamp || incident.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-[#162235]">
            {incident.imageUrl && (
              <a 
                href={incident.imageUrl}
                download={`incident-${incident.id}.jpg`}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white text-center py-2.5 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-violet-600/15"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Download Snapshot</span>
              </a>
            )}
            <button 
              onClick={onClose}
              className="w-full bg-[#121c2e] hover:bg-[#1a2942] text-slate-300 hover:text-white border border-[#1f2f4c] py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
