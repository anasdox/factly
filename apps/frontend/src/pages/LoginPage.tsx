import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../config';
import './LoginPage.css';

/** Label and styling for each provider the backend may offer. */
const PROVIDERS: Record<string, { label: string; className: string }> = {
  pocketid: { label: 'Sign in with Pocket ID', className: 'login-oauth-pocketid' },
  github: { label: 'Sign in with GitHub', className: 'login-oauth-github' },
  google: { label: 'Sign in with Google', className: 'login-oauth-google' },
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<string[]>([]);
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle the return from an identity provider (token in URL)
  useEffect(() => {
    const token = searchParams.get('token');
    const user = searchParams.get('user');
    if (token && user) {
      loginWithToken(token, user);
      navigate('/', { replace: true });
    }
  }, [searchParams, loginWithToken, navigate]);

  // Which identity providers to offer
  useEffect(() => {
    fetch(`${API_URL}/auth/providers`)
      .then(res => res.ok ? res.json() : { providers: [] })
      .then(data => setOauthProviders(data.providers || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: string) => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  const offered = oauthProviders.filter((name) => name in PROVIDERS);

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form">
        <h2 className="login-title">Login</h2>
        {error && <div className="login-error">{error}</div>}

        {offered.length > 0 && (
          <div className="login-oauth">
            {offered.map((name) => (
              <button
                key={name}
                type="button"
                className={`login-oauth-btn ${PROVIDERS[name].className}`}
                onClick={() => handleOAuth(name)}
              >
                {PROVIDERS[name].label}
              </button>
            ))}
            <div className="login-divider"><span>or</span></div>
          </div>
        )}

        <div className="login-field">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            className="login-input"
          />
        </div>
        <div className="login-field">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
        </div>
        <button type="submit" disabled={loading} className="login-btn">
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {/* No sign-up link: accounts come from an identity provider or the CLI. */}
      </form>
    </div>
  );
}
