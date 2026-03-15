import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';

export interface FeedbackWidgetProps {
  /** Base URL of the feedback API (e.g. "/feedback" or "https://api.example.com/feedback") */
  apiUrl: string;
  /** Auth token to include in requests. If null, voting is disabled. */
  token?: string | null;
  /** Current username, shown as author indicator */
  user?: string | null;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  author: string | null;
  vote_count: number;
  created_at: string;
}

const styles = {
  container: { fontFamily: 'inherit', maxWidth: 600, margin: '0 auto', color: 'var(--text-primary)' } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } as React.CSSProperties,
  title: { fontSize: '1.2em', fontWeight: 600, margin: 0 } as React.CSSProperties,
  form: { display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24, padding: 16, border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-surface)' },
  input: { width: '100%', boxSizing: 'border-box' as const, padding: '8px 12px', border: '1px solid var(--border-input)', borderRadius: 4, fontSize: '0.95em', background: 'var(--bg-surface)', color: 'var(--text-primary)' } as React.CSSProperties,
  textarea: { width: '100%', boxSizing: 'border-box' as const, padding: '8px 12px', border: '1px solid var(--border-input)', borderRadius: 4, fontSize: '0.95em', resize: 'vertical' as const, minHeight: 96, background: 'var(--bg-surface)', color: 'var(--text-primary)' } as React.CSSProperties,
  submitBtn: { padding: '8px 16px', border: '1px solid var(--border-btn)', borderRadius: 4, background: 'var(--bg-btn)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.95em' } as React.CSSProperties,
  card: { display: 'flex', gap: 12, padding: 16, border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 8, background: 'var(--bg-surface)' } as React.CSSProperties,
  voteBox: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', minWidth: 48, gap: 2 },
  voteBtn: (active: boolean) => ({
    padding: '4px 12px', border: '1px solid var(--border-btn)', borderRadius: 4, cursor: 'pointer', fontSize: '1.1em',
    background: active ? 'var(--color-accent, var(--bg-btn))' : 'transparent', color: active ? 'var(--bg-surface)' : 'var(--text-primary)',
  } as React.CSSProperties),
  voteCount: { fontSize: '1.1em', fontWeight: 600 } as React.CSSProperties,
  cardContent: { flex: 1 } as React.CSSProperties,
  cardTitle: { fontWeight: 600, marginBottom: 4 } as React.CSSProperties,
  cardDesc: { fontSize: '0.9em', color: 'var(--text-secondary)', marginBottom: 4 } as React.CSSProperties,
  cardMeta: { fontSize: '0.8em', color: 'var(--text-secondary)' } as React.CSSProperties,
  empty: { textAlign: 'center' as const, padding: 32, color: 'var(--text-secondary)' },
  toggleBtn: { padding: '6px 14px', border: '1px solid var(--border-btn)', borderRadius: 4, cursor: 'pointer', background: 'var(--bg-btn)', color: 'var(--text-primary)', fontSize: '0.9em' } as React.CSSProperties,
  counter: { textAlign: 'right' as const, fontSize: '0.75em', color: 'var(--text-secondary)', marginTop: 2 } as React.CSSProperties,
  sortBar: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 } as React.CSSProperties,
  sortBtn: { padding: '3px 10px', border: '1px solid var(--border-btn)', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.8em' } as React.CSSProperties,
  sortBtnActive: { padding: '3px 10px', border: '1px solid var(--border-btn)', borderRadius: 4, cursor: 'pointer', background: 'var(--bg-btn)', color: 'var(--text-primary)', fontSize: '0.8em', fontWeight: 600 } as React.CSSProperties,
  deleteBtn: { marginLeft: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85em', padding: '0 4px' } as React.CSSProperties,
};

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ apiUrl, token, user }) => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'votes' | 'date'>('votes');

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, [token]);

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch(apiUrl, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas || []);
      }
    } catch { /* ignore */ }
  }, [apiUrl, headers]);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      if (res.ok) {
        setTitle('');
        setDescription('');
        setShowForm(false);
        await fetchIdeas();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/${id}/vote`, {
        method: 'POST',
        headers: headers(),
      });
      if (res.ok) {
        const { voted } = await res.json();
        setVotedIds(prev => {
          const next = new Set(prev);
          voted ? next.add(id) : next.delete(id);
          return next;
        });
        await fetchIdeas();
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/${id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (res.ok) await fetchIdeas();
    } catch { /* ignore */ }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Ideas & Feedback</h2>
        {token && (
          <button style={styles.toggleBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Idea'}
          </button>
        )}
      </div>

      {showForm && (
        <form style={styles.form} onSubmit={handleSubmit}>
          <div>
            <input
              style={styles.input}
              placeholder="Title"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 100))}
              maxLength={100}
              required
            />
            <div style={styles.counter}>{title.length}/100</div>
          </div>
          <div>
            <textarea
              style={styles.textarea}
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 500))}
              maxLength={500}
            />
            <div style={styles.counter}>{description.length}/500</div>
          </div>
          <button type="submit" style={styles.submitBtn} disabled={submitting || !title.trim()}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      )}

      {ideas.length > 0 && (
        <div style={styles.sortBar}>
          <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Sort by:</span>
          <button
            style={sortBy === 'votes' ? styles.sortBtnActive : styles.sortBtn}
            onClick={() => setSortBy('votes')}
          >Votes</button>
          <button
            style={sortBy === 'date' ? styles.sortBtnActive : styles.sortBtn}
            onClick={() => setSortBy('date')}
          >Newest</button>
        </div>
      )}

      {ideas.length === 0 && <p style={styles.empty}>No ideas yet. Be the first!</p>}

      {[...ideas].sort((a, b) =>
        sortBy === 'votes'
          ? b.vote_count - a.vote_count || b.created_at.localeCompare(a.created_at)
          : b.created_at.localeCompare(a.created_at)
      ).map(idea => (
        <div key={idea.id} style={styles.card}>
          <div style={styles.voteBox}>
            <button
              style={styles.voteBtn(votedIds.has(idea.id))}
              onClick={() => handleVote(idea.id)}
              disabled={!token}
              title={token ? 'Vote' : 'Login to vote'}
            >
              ▲
            </button>
            <span style={styles.voteCount}>{idea.vote_count}</span>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.cardTitle}>{idea.title}</div>
            {idea.description && <div style={styles.cardDesc}>{idea.description}</div>}
            <div style={styles.cardMeta}>
              by {idea.author || 'anonymous'}
              {user && idea.author === user && (
                <button style={styles.deleteBtn} onClick={() => handleDelete(idea.id)} title="Delete"><FontAwesomeIcon icon={faTrashCan} /></button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
