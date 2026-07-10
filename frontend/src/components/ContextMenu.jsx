export default function ContextMenu({ contextMenu, onDrawPerimeter, onDeleteCamera, onClose }) {
  if (!contextMenu) return null;

  const style = {
    top: `${Math.min(contextMenu.y, window.innerHeight - 120)}px`,
    left: `${Math.min(contextMenu.x, window.innerWidth - 180)}px`,
  };

  return (
    <div
      className="fixed z-[300] bg-soc-sidebar border border-soc-border rounded-xl shadow-2xl py-1.5 flex flex-col min-w-[150px] font-sans"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-soc-warning hover:bg-white/5 transition-all text-left cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
          onDrawPerimeter(contextMenu.cameraId);
        }}
      >
        <span className="material-symbols-outlined text-sm">polyline</span>
        <span>Virtual Perimeter</span>
      </button>
      <button
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-soc-danger hover:bg-white/5 transition-all text-left cursor-pointer"
        onClick={(e) => onDeleteCamera(e, contextMenu.cameraId, contextMenu.cameraName)}
      >
        <span className="material-symbols-outlined text-sm">delete</span>
        <span>Delete Camera</span>
      </button>
    </div>
  );
}
