import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../config';

interface DiscoverySummary {
  discovery_id: string;
  title: string;
  goal: string;
  date: string;
  role: 'owned' | 'visited';
}

export default function PersonalSpace() {
  const { user, token, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [discoveries, setDiscoveries] = useState<DiscoverySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchDiscoveries();
  }, [isAuthenticated]);

  const fetchDiscoveries = async () => {
    try {
      const response = await fetch(`${API_URL}/me/discoveries`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to load discoveries');
      }
      const data = await response.json();
      setDiscoveries(data.discoveries || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const owned = discoveries.filter((d) => d.role === 'owned');
  const visited = discoveries.filter((d) => d.role === 'visited');

  const cardStyle: React.CSSProperties = {
    padding: '1rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color, #ddd)',
    background: 'var(--bg-secondary, #fff)',
    marginBottom: '0.75rem',
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', color: 'var(--text-primary, #333)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>My Space</h1>
        <div>
          <span style={{ marginRight: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>{user}</span>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--border-color, #ccc)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary, #333)' }}>
            Logout
          </button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#d32f2f' }}>{error}</p>}

      {!loading && (
        <>
          <section style={{ marginBottom: '2rem' }}>
            <h2>My discoveries ({owned.length})</h2>
            {owned.length === 0 && <p style={{ color: 'var(--text-secondary, #666)' }}>No discoveries created yet.</p>}
            {owned.map((d) => (
              <Link key={d.discovery_id} to={`/?invite=${d.discovery_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={cardStyle}>
                  <strong>{d.title || 'Untitled'}</strong>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #666)', marginTop: '0.25rem' }}>{d.goal}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', marginTop: '0.25rem' }}>{d.date}</div>
                </div>
              </Link>
            ))}
          </section>

          {visited.length > 0 && (
            <section>
              <h2>Shared with me ({visited.length})</h2>
              {visited.map((d) => (
                <Link key={d.discovery_id} to={`/?invite=${d.discovery_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={cardStyle}>
                    <strong>{d.title || 'Untitled'}</strong>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #666)', marginTop: '0.25rem' }}>{d.goal}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', marginTop: '0.25rem' }}>{d.date}</div>
                  </div>
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
