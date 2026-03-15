import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../config';
import { FeedbackWidget } from '../components/FeedbackWidget';

export default function FeedbackPage() {
  const { token, user } = useAuth();

  return (
    <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <FeedbackWidget apiUrl={`${API_URL}/feedback`} token={token} user={user} />
    </div>
  );
}
