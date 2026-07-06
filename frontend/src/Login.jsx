import { useState, useEffect, useRef } from 'react';
import { API, CLOUD_API } from './config';

export default function Login({ onAuthSuccess, onModeSelect, currentMode = 'edge', onRegisterDevice }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('OPERATOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registerComplete, setRegisterComplete] = useState(false);
  const authTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const authApi = isLogin && currentMode === 'cloud' ? CLOUD_API : API;
    const url = isLogin
      ? `${authApi.AUTH}/login`
      : `${API.AUTH}/register`;

    const payload = isLogin
      ? { email, password }
      : { name, email, password, role };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      if (isLogin) {
        setSuccess('Authentication successful! Loading dashboard...');
        authTimeoutRef.current = setTimeout(() => {
          if (onAuthSuccess) {
            onAuthSuccess(data.data.token, data.data.user);
          }
        }, 1500);
      } else {
        setSuccess('Account created successfully!');
        setRegisterComplete(true);
        setPassword('');
        authTimeoutRef.current = setTimeout(() => {
          setRegisterComplete(false);
          setIsLogin(true);
          setSuccess('');
        }, 2200);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setName('');
    setEmail('');
    setPassword('');
    setRole('OPERATOR');
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-[#060b13] relative overflow-hidden font-sans p-4 select-none">
      {/* Background blobs for premium glowing visuals */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-pink-500/5 blur-[120px] pointer-events-none animate-pulse"></div>

      <div className="w-full max-w-[460px] p-8 md:p-10 bg-[#090f19]/45 backdrop-blur-2xl border border-[#162235] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] z-10 relative">
        {registerComplete ? (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <svg
                className="w-10 h-10 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Success!</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your account has been registered. Redirecting you to login...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="flex justify-center items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-violet-600/10 border border-violet-500/20 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.15)] text-violet-400">
                  <span className="material-symbols-outlined text-lg">visibility</span>
                </div>
                <span className="text-xl font-bold text-white tracking-wider uppercase">Nirikshan AI</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                {isLogin ? 'Welcome Back' : 'Get Started'}
              </h2>
              <p className="text-slate-400 text-xs">
                {isLogin
                  ? 'Sign in to access your surveillance dashboard'
                  : 'Register a new account to monitor secure areas'}
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  onClick={onModeSelect}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c1524] hover:bg-violet-600/10 border border-[#162235] hover:border-violet-500/30 rounded-xl text-[10px] font-semibold text-slate-400 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-sm">{currentMode === 'cloud' ? 'cloud' : 'lan'}</span>
                  <span className="uppercase">{currentMode === 'cloud' ? 'Cloud Mode' : 'Edge Mode'}</span>
                  <span className="material-symbols-outlined text-xs">swap_horiz</span>
                </button>
                {currentMode === 'cloud' && onRegisterDevice && (
                  <button
                    onClick={onRegisterDevice}
                    className="px-3 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-400 rounded-xl text-[10px] font-semibold transition-all"
                  >
                    Link Edge Device
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 mb-6 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs rounded-xl flex items-center gap-2.5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success Message (Redirecting...) */}
            {success && !registerComplete && (
              <div className="p-3.5 mb-6 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl flex items-center gap-2.5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Full Name Input (Only for Register) */}
              {!isLogin && (
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="name">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-[#64748b] pointer-events-none text-base">person</span>
                    <input
                      id="name"
                      type="text"
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-[#64748b] focus:outline-none focus:bg-white/[0.07] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all font-sans"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="email">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-[#64748b] pointer-events-none text-base">mail</span>
                  <input
                    id="email"
                    type="email"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-[#64748b] focus:outline-none focus:bg-white/[0.07] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all font-sans"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="password">
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-[#64748b] pointer-events-none text-base">lock</span>
                  <input
                    id="password"
                    type="password"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-[#64748b] focus:outline-none focus:bg-white/[0.07] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all font-sans"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Role Select (Only for Register) */}
              {!isLogin && (
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="role">
                    Role
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-[#64748b] pointer-events-none text-base">manage_accounts</span>
                    <select
                      id="role"
                      className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:bg-white/[0.07] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all font-sans appearance-none cursor-pointer"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option className="bg-[#090f19] text-white" value="OPERATOR">Operator</option>
                      <option className="bg-[#090f19] text-white" value="ADMIN">Administrator</option>
                    </select>
                    <span className="absolute right-4 text-[#64748b] pointer-events-none text-xs">▼</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:from-violet-600 active:to-indigo-600 disabled:opacity-60 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 flex justify-center items-center cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <span className="text-xs text-slate-400">
                {isLogin
                  ? "Don't have an account yet?"
                  : 'Already have an account?'}
              </span>
              <button
                onClick={handleToggle}
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors ml-1.5 cursor-pointer"
                type="button"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
