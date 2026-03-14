import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/me');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary, #f5f5f5)' }}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--bg-secondary, #fff)', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '320px' }}>
        <h2 style={{ margin: '0 0 1.5rem', textAlign: 'center', color: 'var(--text-primary, #333)' }}>Login</h2>
        {error && <div style={{ color: '#d32f2f', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #ccc)', boxSizing: 'border-box', fontSize: '1rem' }}
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #ccc)', boxSizing: 'border-box', fontSize: '1rem' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: 'none', background: 'var(--accent-color, #1976d2)', color: '#fff', fontSize: '1rem', cursor: loading ? 'wait' : 'pointer' }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
