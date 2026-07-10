import { useState } from 'react';

export default function SnapshotViewer({ incident, onClose }) {
  if (!incident) return null;

  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  function isValidUrl(str) {
    if (!str) return false;
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('blob:') || str.startsWith('data:');
  }

  const rawImageSrc = incident.imageUrl || incident.snapshotUrl;
  const imageSrc = !imageError && isValidUrl(rawImageSrc) ? rawImageSrc : null;
  const clipSrc = !videoError && isValidUrl(incident.clipUrl) ? incident.clipUrl : null;

  const isCritical = incident.severity === 'CRITICAL';
  const isWarning = incident.severity === 'WARNING' || incident.severity === 'HIGH' || incident.type?.includes('CROWD');
  let sevColor = 'bg-soc-info/10 text-soc-info border border-soc-info/20';
  if (isCritical) sevColor = 'bg-soc-danger/10 text-soc-danger border border-soc-danger/20';
  else if (isWarning) sevColor = 'bg-soc-warning/10 text-soc-warning border border-soc-warning/20';

  return (
    <div className="fixed inset-0 bg-[#070B14]/90 backdrop-blur-md flex items-center justify-center z-[250] p-4 font-sans animate-fade-in">
      <div className="bg-soc-sidebar border border-soc-border w-full max-w-4xl rounded-2xl p-6 flex flex-col md:flex-row shadow-2xl relative overflow-hidden h-[85vh] max-h-[700px]">
        
        <button 
          className="absolute top-4 right-4 bg-soc-card hover:bg-soc-cardElevated text-white w-8 h-8 rounded-full flex items-center justify-center z-50 text-xl font-bold transition-colors border border-soc-border cursor-pointer" 
          onClick={onClose}
        >
          ×
        </button>

        <div className="flex-1 bg-black flex flex-col items-center justify-center relative overflow-hidden h-1/2 md:h-full">
          {imageSrc ? (
            <img 
              src={imageSrc} 
              alt="Incident Snapshot" 
              className="w-full h-1/2 object-contain shrink-0"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="text-center p-8">
              <span className="material-symbols-outlined text-soc-textMuted text-5xl mb-2">image_not_supported</span>
              <p className="text-soc-textMuted text-xs">No snapshot image available for this alert.</p>
            </div>
          )}
          {clipSrc && (
            <div className="w-full h-1/2 border-t border-soc-border flex flex-col">
              <div className="text-[9px] font-bold text-soc-textMuted uppercase tracking-wider px-3 py-1 shrink-0">Incident Clip</div>
              <video 
                src={clipSrc} 
                controls
                className="w-full flex-1 object-contain bg-black"
                onError={() => setVideoError(true)}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          {!imageSrc && !clipSrc && (
            <div className="text-center p-8">
              <span className="material-symbols-outlined text-soc-textMuted text-5xl mb-2">videocam_off</span>
              <p className="text-soc-textMuted text-xs">No media available for this alert.</p>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-soc-sidebar/85 backdrop-blur-md px-3 py-1.5 border border-soc-border rounded-lg text-[9px] font-bold text-soc-textSecondary font-mono flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 bg-soc-danger rounded-full animate-ping"></span>
            <span>TELEMETRY OVERLAY FRAME</span>
          </div>
        </div>

        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-soc-border bg-soc-sidebar p-6 flex flex-col justify-between shrink-0 h-1/2 md:h-full overflow-y-auto">
          <div className="flex flex-col gap-5">
            <div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${sevColor}`}>
                {incident.severity || 'CRITICAL'}
              </span>
              <h3 className="text-sm font-bold text-soc-textPrimary uppercase tracking-wider mt-2.5">{incident.type}</h3>
              <p className="text-[10px] text-soc-textMuted font-mono mt-0.5">ID: {incident.id}</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 bg-soc-card border border-soc-border rounded-xl p-3">
                <span className="text-[9px] font-bold text-soc-textMuted uppercase tracking-wider">Detection Location</span>
                <div className="flex items-center gap-1.5 text-xs text-soc-textPrimary mt-0.5">
                  <span className="material-symbols-outlined text-sm text-soc-textMuted font-bold">location_on</span>
                  <span>{incident.camera ? incident.camera.location : incident.location || 'Surveillance Zone'}</span>
                </div>
                {incident.camera && (
                  <span className="text-[10px] text-soc-textMuted font-medium font-sans mt-0.5">
                    Camera: {incident.camera.name}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 bg-soc-card border border-soc-border rounded-xl p-3">
                <span className="text-[9px] font-bold text-soc-textMuted uppercase tracking-wider">Alert Details</span>
                <p className="text-xs text-soc-textSecondary leading-normal mt-0.5 font-medium">{incident.description}</p>
              </div>

              <div className="flex flex-col gap-1 bg-soc-card border border-soc-border rounded-xl p-3">
                <span className="text-[9px] font-bold text-soc-textMuted uppercase tracking-wider">Incident Timestamp</span>
                <div className="flex items-center gap-1.5 text-xs text-soc-textPrimary mt-0.5 font-mono">
                  <span className="material-symbols-outlined text-sm text-soc-textMuted font-sans">schedule</span>
                  <span>{new Date(incident.timestamp || incident.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-soc-border">
            {imageSrc && (
              <a 
                href={imageSrc}
                download={`incident-${incident.id}.jpg`}
                className="w-full bg-primary hover:bg-primary-hover text-white text-center py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Download Snapshot</span>
              </a>
            )}
            {clipSrc && (
              <a 
                href={clipSrc}
                download={`incident-${incident.id}.mp4`}
                className="w-full bg-soc-success hover:bg-soc-success/90 text-white text-center py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Download Clip</span>
              </a>
            )}
            <button 
              onClick={onClose}
              className="w-full bg-soc-card hover:bg-soc-cardElevated text-soc-textSecondary hover:text-white border border-soc-border py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
