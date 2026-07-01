import { useState, useEffect, useRef } from 'react';
import { API } from './config';
import './Login.css';

export default function Login({ onAuthSuccess }) {
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

    const url = isLogin
      ? `${API.AUTH}/login`
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
    <div className="auth-container">
      {/* Background blobs for premium glowing visuals */}
      <div className="auth-bg-blob blob-purple"></div>
      <div className="auth-bg-blob blob-cyan"></div>
      <div className="auth-bg-blob blob-pink"></div>

      <div className="auth-card">
        {registerComplete ? (
          <div className="auth-success-screen">
            <div className="auth-success-icon-container">
              <svg
                className="auth-success-svg"
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
            <h2 className="auth-title">Success!</h2>
            <p className="auth-subtitle" style={{ fontSize: '16px', color: '#cbd5e1' }}>
              Your account has been registered. Redirecting you to login...
            </p>
          </div>
        ) : (
          <>
            <div className="auth-header">
              <div className="auth-logo-container">
                <div className="auth-logo-icon">
                  <svg className="auth-logo-svg" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
                  </svg>
                </div>
                <span className="auth-logo-text">Nirikshan AI</span>
              </div>
              <h2 className="auth-title">
                {isLogin ? 'Welcome Back' : 'Get Started'}
              </h2>
              <p className="auth-subtitle">
                {isLogin
                  ? 'Sign in to access your surveillance dashboard'
                  : 'Register a new account to monitor secure areas'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="auth-alert auth-alert-error">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
              <div className="auth-alert auth-alert-success">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              {/* Full Name Input (Only for Register) */}
              {!isLogin && (
                <div className="auth-input-group">
                  <label className="auth-label" htmlFor="name">
                    Full Name
                  </label>
                  <div className="auth-input-wrapper">
                    <svg
                      className="auth-input-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      id="name"
                      type="text"
                      className="auth-input"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="email">
                  Email Address
                </label>
                <div className="auth-input-wrapper">
                  <svg
                    className="auth-input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    className="auth-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="password">
                  Password
                </label>
                <div className="auth-input-wrapper">
                  <svg
                    className="auth-input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="password"
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Role Select (Only for Register) */}
              {!isLogin && (
                <div className="auth-input-group">
                  <label className="auth-label" htmlFor="role">
                    Role
                  </label>
                  <div className="auth-input-wrapper">
                    <svg
                      className="auth-input-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M12 2v9M8 5h8" />
                    </svg>
                    <select
                      id="role"
                      className="auth-input"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="OPERATOR">Operator</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                    <span className="auth-input-select-arrow">▼</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? <div className="auth-spinner"></div> : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="auth-footer">
              <span className="auth-switch-text">
                {isLogin
                  ? "Don't have an account yet?"
                  : 'Already have an account?'}
              </span>
              <button
                onClick={handleToggle}
                className="auth-switch-btn"
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
