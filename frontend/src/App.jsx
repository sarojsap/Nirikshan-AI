import React, { useState } from 'react';
import Login from './Login';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  const handleAuthSuccess = (newToken, authUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(authUser));
    setToken(newToken);
    setUser(authUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  if (!token) {
    return <Login onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="dashboard-container">
      <div className="auth-bg-blob blob-purple" style={{ opacity: 0.15 }}></div>
      <div className="auth-bg-blob blob-cyan" style={{ opacity: 0.15 }}></div>
      
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-logo-icon">
            <svg className="brand-logo-svg" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
            </svg>
          </div>
          <span className="brand-name">Nirikshan AI Dashboard</span>
        </div>
        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-card">
          <h1>Welcome, {user?.username}!</h1>
          <p>Authentication successfully verified via the Node.js secure backend.</p>
          <div className="status-badge-container">
            <span className="status-badge active">
              <span className="pulse-dot"></span> System Connected
            </span>
          </div>
        </div>

        <section className="next-steps-dashboard">
          <h2>Next Steps</h2>
          <div className="steps-grid">
            <div className="step-card">
              <h3>📹 Camera Feed</h3>
              <p>Configure a camera stream inside the backend using swagger and launch the Python AI service to begin detection.</p>
            </div>
            <div className="step-card">
              <h3>🚨 Live Incidents</h3>
              <p>Incidents detected by YOLOv8 will stream here in real-time once the services are active.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
