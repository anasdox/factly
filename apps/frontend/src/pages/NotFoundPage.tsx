import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-primary)', background: 'var(--bg-page)' }}>
      <h1 style={{ fontSize: '4em', margin: 0, opacity: 0.3 }}>404</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Page not found</p>
      <button
        onClick={() => navigate('/')}
        style={{ padding: '8px 20px', borderRadius: 4, border: '1px solid var(--border-btn)', background: 'var(--bg-btn)', color: 'var(--text-primary)', cursor: 'pointer' }}
      >
        Back to home
      </button>
    </div>
  );
}
