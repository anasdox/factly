import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../config';
import './PersonalSpace.css';

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

  return (
    <div className="personal-space">
      <div className="personal-space-header">
        <h1>My Space</h1>
        <div className="personal-space-user">
          <span className="personal-space-username">{user}</span>
          <button className="personal-space-logout" onClick={() => { logout(); navigate('/login'); }}>
            Logout
          </button>
        </div>
      </div>

      {loading && <p className="personal-space-status">Loading...</p>}
      {error && <p className="personal-space-error">{error}</p>}

      {!loading && (
        <>
          <section className="personal-space-section">
            <h2>My discoveries ({owned.length})</h2>
            {owned.length === 0 && <p className="personal-space-empty">No discoveries created yet.</p>}
            {owned.map((d) => (
              <Link key={d.discovery_id} to={`/?invite=${d.discovery_id}`} className="personal-space-card-link">
                <div className="personal-space-card">
                  <strong>{d.title || 'Untitled'}</strong>
                  <div className="personal-space-card-goal">{d.goal}</div>
                  <div className="personal-space-card-date">{d.date}</div>
                </div>
              </Link>
            ))}
          </section>

          {visited.length > 0 && (
            <section className="personal-space-section">
              <h2>Shared with me ({visited.length})</h2>
              {visited.map((d) => (
                <Link key={d.discovery_id} to={`/?invite=${d.discovery_id}`} className="personal-space-card-link">
                  <div className="personal-space-card">
                    <strong>{d.title || 'Untitled'}</strong>
                    <div className="personal-space-card-goal">{d.goal}</div>
                    <div className="personal-space-card-date">{d.date}</div>
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
