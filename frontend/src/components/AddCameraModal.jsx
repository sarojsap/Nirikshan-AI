import { useState } from 'react';
import { API } from '../config';

export default function AddCameraModal({ isOpen, onClose, token, onLogout, onSuccess }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [sourceType, setSourceType] = useState('webcam');
  const [rtspUrl, setRtspUrl] = useState('0');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSourceTypeChange = (type) => {
    setSourceType(type);
    if (type === 'webcam') {
      setRtspUrl('0');
    } else {
      setRtspUrl('rtsp://192.168.1.100:554/stream');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API.CAMERAS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, location, rtspUrl }),
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add camera.');
      }

      setName('');
      setLocation('');
      setSourceType('webcam');
      setRtspUrl('0');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#070B14]/85 flex items-center justify-center z-[200] p-4">
      <div className="bg-soc-sidebar border border-soc-border w-full max-w-md rounded-2xl p-6 flex flex-col shadow-2xl relative font-sans">
        <div className="flex justify-between items-center pb-3 border-b border-soc-border mb-4 shrink-0">
          <h3 className="text-sm font-bold text-soc-textPrimary uppercase tracking-wider">Register New Camera</h3>
          <button className="text-soc-textMuted hover:text-white text-lg font-bold cursor-pointer" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-soc-danger/10 border border-soc-danger/20 text-soc-danger text-xs rounded-xl shrink-0">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted">Camera Name</label>
            <input
              type="text"
              className="bg-soc-card border border-soc-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-sans"
              placeholder="e.g. Front Gate Entrance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted">Location</label>
            <input
              type="text"
              className="bg-soc-card border border-soc-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-sans"
              placeholder="e.g. Lobby / Parking Lot"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted">Source Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  sourceType === 'webcam'
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-transparent border-soc-border text-soc-textSecondary hover:bg-white/5'
                }`}
                onClick={() => handleSourceTypeChange('webcam')}
              >
                Webcam (USB)
              </button>
              <button
                type="button"
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  sourceType === 'rtsp'
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-transparent border-soc-border text-soc-textSecondary hover:bg-white/5'
                }`}
                onClick={() => handleSourceTypeChange('rtsp')}
              >
                RTSP / Network IP
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted">
              {sourceType === 'webcam' ? 'Webcam Device Index' : 'RTSP Network Address'}
            </label>
            <input
              type="text"
              className="bg-soc-card border border-soc-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-sans"
              placeholder={sourceType === 'webcam' ? '0, 1, 2' : 'rtsp://user:pass@ip:port/h264'}
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2 justify-end mt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-soc-border bg-soc-card text-soc-textSecondary hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
            >
              Register Camera
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
