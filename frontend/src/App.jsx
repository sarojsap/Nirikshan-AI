import { useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import './App.css';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

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

  return <Dashboard token={token} user={user} onLogout={handleLogout} />;
}

export default App;
