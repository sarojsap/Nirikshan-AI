import { memo } from 'react';
import { useCameraStream } from '../hooks/useCameraStream';

function LiveFeedCard({ cam, onClick, onDelete }) {
  const { canvasRef, isOffline, retry } = useCameraStream(cam.id);

  return (
    <div
      className="bg-soc-sidebar border border-soc-border rounded-2xl overflow-hidden flex flex-col shadow-xl group hover:border-primary/45 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover ${isOffline ? 'hidden' : ''}`}
        />
        
        {isOffline && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-[#070B14]/65 text-soc-textMuted text-[10px] text-center z-10">
            <span className="material-symbols-outlined text-lg mb-1 text-soc-textMuted">videocam_off</span>
            <span className="font-semibold text-soc-textMuted mb-2">Feed Offline</span>
            <button
              onClick={(e) => { e.stopPropagation(); retry(); }}
              className="px-2.5 py-1 bg-soc-card hover:bg-soc-cardElevated border border-soc-border text-soc-textSecondary hover:text-white rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider flex items-center gap-1 shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[10px]">refresh</span>
              <span>Retry</span>
            </button>
          </div>
        )}

        <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start bg-gradient-to-b from-[#070B14]/90 to-transparent z-10">
          <div>
            <h3 className="text-xs font-semibold text-soc-textPrimary drop-shadow">{cam.name}</h3>
            <p className="text-[9px] text-soc-textSecondary drop-shadow mt-0.5">{cam.location}</p>
          </div>
          <span className={`${isOffline ? 'bg-soc-danger/10 text-soc-danger border-soc-danger/20' : 'bg-soc-success/10 text-soc-success border-soc-success/20'} border px-1.5 py-0.5 rounded-full font-bold text-[8px] flex items-center gap-1 shadow-sm`}>
            <span className={`w-1 h-1 ${isOffline ? 'bg-soc-danger' : 'bg-soc-success animate-pulse'} rounded-full`}></span>
            <span>{isOffline ? 'OFFLINE' : 'LIVE'}</span>
          </span>
        </div>
      </div>

      <div className="bg-soc-sidebar/60 px-4 py-2 border-t border-soc-border text-[10px] text-soc-textMuted flex justify-between items-center">
        <span className="font-semibold text-soc-textSecondary">
          {cam.rtspUrl.length === 1 ? 'Webcam Feed' : 'Network Stream'}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-soc-danger/10 hover:bg-soc-danger/20 border border-soc-danger/20 text-soc-danger transition-all text-[9px] font-bold uppercase tracking-wider cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(e, cam.id, cam.name);
            }}
            title={`Delete ${cam.name}`}
          >
            <span className="material-symbols-outlined text-[12px]">delete</span>
            <span>Delete</span>
          </button>
          <span className="text-soc-textMuted hover:text-white transition-colors text-[9px] uppercase tracking-wider font-bold">
            Click to expand
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(LiveFeedCard, (prev, next) => {
  return prev.cam.id === next.cam.id;
});
