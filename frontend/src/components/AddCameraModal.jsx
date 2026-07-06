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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
      <div className="bg-[#090f19] border border-[#162235] w-full max-w-md rounded-2xl p-6 flex flex-col shadow-2xl relative font-sans">
        <div className="flex justify-between items-center pb-3 border-b border-[#162235] mb-4 shrink-0">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Register New Camera</h3>
          <button className="text-slate-400 hover:text-white text-lg font-bold" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl shrink-0">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Camera Name</label>
            <input
              type="text"
              className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans"
              placeholder="e.g. Front Gate Entrance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</label>
            <input
              type="text"
              className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans"
              placeholder="e.g. Lobby / Parking Lot"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Source Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  sourceType === 'webcam'
                    ? 'bg-violet-600/10 border-violet-500 text-violet-400 font-bold'
                    : 'bg-transparent border-[#1b2a47] text-slate-400 hover:bg-white/5'
                }`}
                onClick={() => handleSourceTypeChange('webcam')}
              >
                Webcam (USB)
              </button>
              <button
                type="button"
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  sourceType === 'rtsp'
                    ? 'bg-violet-600/10 border-violet-500 text-violet-400 font-bold'
                    : 'bg-transparent border-[#1b2a47] text-slate-400 hover:bg-white/5'
                }`}
                onClick={() => handleSourceTypeChange('rtsp')}
              >
                RTSP / Network IP
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {sourceType === 'webcam' ? 'Webcam Device Index' : 'RTSP Network Address'}
            </label>
            <input
              type="text"
              className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans"
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
              className="px-4 py-2 border border-[#1b2a47] text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-500 transition-colors shadow-[0_0_15px_rgba(124,58,237,0.2)] disabled:opacity-60"
            >
              Register Camera
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
