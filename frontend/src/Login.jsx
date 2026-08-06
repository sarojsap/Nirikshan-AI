import { useState, useEffect, useRef } from 'react';
import { API, CLOUD_API } from './config';

export default function Login({ onAuthSuccess, onModeSelect, currentMode = 'edge', onRegisterDevice }) {
  const [isLogin, setIsLogin] = useState(true);
  const [forgotStep, setForgotStep] = useState(null); // null | 'request' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
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

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const authApi = currentMode === 'cloud' ? CLOUD_API : API;
    try {
      const res = await fetch(`${authApi.AUTH}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification OTP code.');
      setSuccess('Verification OTP sent! Please check your email.');
      setForgotStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const authApi = currentMode === 'cloud' ? CLOUD_API : API;
    try {
      const res = await fetch(`${authApi.AUTH}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
      setSuccess('Password reset successfully! You can now log in.');
      setOtp('');
      setNewPassword('');
      setTimeout(() => {
        setForgotStep(null);
        setIsLogin(true);
        setSuccess('Password reset successfully! Please sign in with your new password.');
      }, 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setForgotStep(null);
    setError('');
    setSuccess('');
    setName('');
    setEmail('');
    setPassword('');
    setOtp('');
    setNewPassword('');
    setRole('OPERATOR');
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-soc-bg relative overflow-hidden font-sans p-4 select-none animate-fade-in">
      {/* Subtle enterprise SOC background lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[130px] pointer-events-none"></div>

      <div className="w-full max-w-[440px] p-8 md:p-10 bg-soc-sidebar border border-soc-border rounded-2xl shadow-xl z-10 relative">
        {registerComplete ? (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-soc-success/10 border border-soc-success/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg
                className="w-10 h-10 text-soc-success"
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
            <h2 className="text-2xl font-bold text-soc-textPrimary mb-2 tracking-tight">Success!</h2>
            <p className="text-soc-textMuted text-xs leading-relaxed">
              Your account has been registered. Redirecting you to login...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="flex justify-center items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">visibility</span>
                </div>
                <span className="text-lg font-extrabold text-soc-textPrimary tracking-wider uppercase font-sans">Nirikshan AI</span>
              </div>
              <h2 className="text-xl font-bold text-soc-textPrimary tracking-tight mb-2">
                {forgotStep === 'request' && 'Forgot Password'}
                {forgotStep === 'reset' && 'Enter Verification OTP'}
                {!forgotStep && (isLogin ? 'Welcome Back' : 'Get Started')}
              </h2>
              <p className="text-soc-textMuted text-xs font-medium">
                {forgotStep === 'request' && 'Enter your email address to receive a 6-digit verification code'}
                {forgotStep === 'reset' && 'Enter the 6-digit code sent to your email and choose a new password'}
                {!forgotStep && (isLogin ? 'Sign in to access your surveillance dashboard' : 'Register a new account to monitor secure areas')}
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                {onModeSelect && (
                  <button
                    onClick={onModeSelect}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-soc-card hover:bg-soc-cardElevated border border-soc-border hover:border-primary/45 rounded-xl text-[10px] font-bold text-soc-textSecondary transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">{currentMode === 'cloud' ? 'cloud' : 'lan'}</span>
                    <span className="uppercase">{currentMode === 'cloud' ? 'Cloud Mode' : 'Edge Mode'}</span>
                    <span className="material-symbols-outlined text-xs">swap_horiz</span>
                  </button>
                )}
                {currentMode === 'cloud' && onRegisterDevice && (
                  <button
                    onClick={onRegisterDevice}
                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl text-[10px] font-bold transition-all"
                  >
                    Link Edge Device
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 mb-6 bg-soc-danger/10 border border-soc-danger/25 text-soc-danger text-xs rounded-xl flex items-center gap-2.5">
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
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && !registerComplete && (
              <div className="p-3.5 mb-6 bg-soc-success/10 border border-soc-success/25 text-soc-success text-xs rounded-xl flex items-center gap-2.5">
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
                <span className="font-medium">{success}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotPasswordRequest} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted" htmlFor="reset-email">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-soc-textMuted pointer-events-none text-base">mail</span>
                    <input
                      id="reset-email"
                      type="email"
                      className="w-full pl-11 pr-4 py-3 bg-soc-card border border-soc-border rounded-xl text-xs text-soc-textPrimary placeholder-[#64748b] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-primary hover:bg-primary-hover active:bg-primary-dark disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex justify-center items-center cursor-pointer shadow-sm"
                  disabled={loading}
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Send OTP Code'}
                </button>
              </form>
            ) : forgotStep === 'reset' ? (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted" htmlFor="otp">
                    6-Digit Verification Code
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-soc-textMuted pointer-events-none text-base">pin</span>
                    <input
                      id="otp"
                      type="text"
                      maxLength={6}
                      className="w-full pl-11 pr-4 py-3 bg-soc-card border border-soc-border rounded-xl text-sm font-bold text-soc-textPrimary tracking-[0.3em] placeholder-[#64748b] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono uppercase"
                      placeholder="XXXXXX"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted" htmlFor="new-password">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-soc-textMuted pointer-events-none text-base">lock</span>
                    <input
                      id="new-password"
                      type="password"
                      className="w-full pl-11 pr-4 py-3 bg-soc-card border border-soc-border rounded-xl text-xs text-soc-textPrimary placeholder-[#64748b] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-primary hover:bg-primary-hover active:bg-primary-dark disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex justify-center items-center cursor-pointer shadow-sm"
                  disabled={loading}
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Reset Password'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Full Name Input (Only for Register) */}
                {!isLogin && (
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted" htmlFor="name">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-soc-textMuted pointer-events-none text-base">person</span>
                      <input
                        id="name"
                        type="text"
                        className="w-full pl-11 pr-4 py-3 bg-soc-card border border-soc-border rounded-xl text-xs text-soc-textPrimary placeholder-[#64748b] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans"
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-soc-textMuted pointer-events-none text-base">mail</span>
                    <input
                      id="email"
                      type="email"
                      className="w-full pl-11 pr-4 py-3 bg-soc-card border border-soc-border rounded-xl text-xs text-soc-textPrimary placeholder-[#64748b] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="flex flex-col gap-1.5 text-left">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted" htmlFor="password">
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setForgotStep('request'); setError(''); setSuccess(''); }}
                        className="text-[10px] text-primary hover:text-primary-hover font-bold hover:underline cursor-pointer transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-soc-textMuted pointer-events-none text-base">lock</span>
                    <input
                      id="password"
                      type="password"
                      className="w-full pl-11 pr-4 py-3 bg-soc-card border border-soc-border rounded-xl text-xs text-soc-textPrimary placeholder-[#64748b] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans"
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-soc-textMuted" htmlFor="role">
                      Role
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-soc-textMuted pointer-events-none text-base">manage_accounts</span>
                      <select
                        id="role"
                        className="w-full pl-11 pr-10 py-3 bg-soc-card border border-soc-border rounded-xl text-xs text-soc-textPrimary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans appearance-none cursor-pointer font-semibold"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option className="bg-[#090f19] text-white" value="OPERATOR">Operator</option>
                        <option className="bg-[#090f19] text-white" value="ADMIN">Administrator</option>
                      </select>
                      <span className="absolute right-4 text-soc-textMuted pointer-events-none text-xs">▼</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-primary hover:bg-primary-hover active:bg-primary-dark disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex justify-center items-center cursor-pointer shadow-sm"
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
            )}

            <div className="text-center mt-6">
              {forgotStep ? (
                <button
                  onClick={() => { setForgotStep(null); setError(''); setSuccess(''); }}
                  className="text-xs font-bold text-soc-textMuted hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                  type="button"
                >
                  <span>← Back to Sign In</span>
                </button>
              ) : (
                <>
                  <span className="text-xs text-soc-textMuted">
                    {isLogin
                      ? "Don't have an account yet?"
                      : 'Already have an account?'}
                  </span>
                  <button
                    onClick={handleToggle}
                    className="text-xs font-bold text-primary hover:text-primary-hover transition-colors ml-1.5 cursor-pointer"
                    type="button"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
