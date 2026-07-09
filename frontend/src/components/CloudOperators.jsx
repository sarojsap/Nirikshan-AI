import { useState, useEffect, useCallback } from 'react';
import { CLOUD_API } from '../config';

export default function CloudOperators({ token, user, onLogout }) {
  const [operators, setOperators] = useState([]);
  const [newOpName, setNewOpName] = useState('');
  const [newOpEmail, setNewOpEmail] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  const [opError, setOpError] = useState('');
  const [opSuccess, setOpSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchOperators = useCallback(async () => {
    try {
      const res = await fetch(`${CLOUD_API.OPERATORS}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { onLogout?.(); return; }
      if (res.ok) {
        const data = await res.json();
        setOperators(data.data || []);
      }
    } catch { /* ignore */ }
  }, [token, onLogout]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOpError('');
    setOpSuccess('');
    try {
      const res = await fetch(`${CLOUD_API.OPERATORS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newOpName, email: newOpEmail, password: newOpPassword })
      });
      if (res.status === 401) { onLogout?.(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add operator.');
      setOpSuccess('Operator added successfully!');
      setNewOpName(''); setNewOpEmail(''); setNewOpPassword('');
      fetchOperators();
    } catch (err) { setOpError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (opId, opName) => {
    if (!window.confirm(`Are you sure you want to delete operator "${opName}"?`)) return;
    try {
      const res = await fetch(`${CLOUD_API.OPERATORS}/${opId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { onLogout?.(); return; }
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to delete operator.'); }
      alert('Operator deleted successfully!');
      fetchOperators();
    } catch (err) { alert(err.message); }
  };

  return (
    <>
      <section className="bg-[#090f19] border border-[#162235] flex-1 rounded-2xl p-6 flex flex-col h-full overflow-hidden shadow-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 shrink-0">Registered Operators</h3>
        <div className="flex-1 overflow-y-auto pr-2 min-h-0">
          {operators.length === 0 ? (
            <p className="text-slate-500 text-xs">No operators registered.</p>
          ) : (
            <div className="w-full flex flex-col gap-2">
              <div className="grid grid-cols-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-2 border-b border-[#162235] px-4 shrink-0">
                <span>Name</span><span>Email Address</span><span className="text-right">Action</span>
              </div>
              {operators.map((op) => (
                <div key={op.id} className="grid grid-cols-3 items-center py-3 border-b border-[#162235] hover:bg-white/5 transition-colors rounded-xl px-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs uppercase">{op.name?.charAt(0)}</div>
                    <span className="font-semibold text-white">{op.name}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px] truncate">{op.email}</span>
                  <div className="text-right">
                    <button onClick={() => handleDelete(op.id, op.name)} className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="bg-[#090f19] border border-[#162235] w-96 rounded-2xl p-6 flex flex-col h-fit shrink-0 shadow-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 shrink-0">Register Operator</h3>
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          {opError && (<div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{opError}</div>)}
          {opSuccess && (<div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{opSuccess}</div>)}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
            <input type="text" className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans" placeholder="Enter full name" value={newOpName} onChange={(e) => setNewOpName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
            <input type="email" className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans" placeholder="operator@nirikshan.cloud" value={newOpEmail} onChange={(e) => setNewOpEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Temporary Password</label>
            <input type="password" className="bg-[#0d1625] border border-[#1b2a47] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 font-sans" placeholder="••••••••" value={newOpPassword} onChange={(e) => setNewOpPassword(e.target.value)} required />
          </div>
          <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl font-semibold text-xs shadow-[0_0_15px_rgba(124,58,237,0.2)] mt-2 transition-colors">{loading ? 'Adding...' : 'Create Operator'}</button>
        </form>
      </section>
    </>
  );
}
