import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheck, faXmark, faPen } from '@fortawesome/free-solid-svg-icons';
import Modal from './Modal';
import { API_URL } from '../config';

export type ReviewItem = {
  id: string;
  entityType: string;
  currentText: string;
  upstreamOldText: string;
  upstreamNewText: string;
  upstreamEntityType: string;
  goal: string;
};

type ProposalState = {
  id: string;
  entityType: string;
  currentText: string;
  proposedText: string;
  loading: boolean;
  error?: string;
};

type Props = {
  items: ReviewItem[];
  onAccept: (id: string, entityType: string, newText: string) => Promise<void>;
  onReject: (id: string, entityType: string) => void;
  onClose: () => void;
};

const BulkReviewPanel: React.FC<Props> = ({ items, onAccept, onReject, onClose }) => {
  // Initialize proposals directly from items so length > 0 on first render
  const [proposals, setProposals] = useState<ProposalState[]>(() =>
    items.map(item => ({
      id: item.id,
      entityType: item.entityType,
      currentText: item.currentText,
      proposedText: '',
      loading: true,
    }))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Fire all proposals in parallel (once)
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    items.forEach(async (item) => {
      try {
        const response = await fetch(`${API_URL}/propose/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity_type: item.entityType,
            current_text: item.currentText,
            upstream_change: {
              old_text: item.upstreamOldText,
              new_text: item.upstreamNewText,
              entity_type: item.upstreamEntityType,
            },
            goal: item.goal,
          }),
        });

        if (!response.ok) {
          const body = await response.json();
          setProposals(prev => prev.map(p =>
            p.id === item.id ? { ...p, loading: false, error: body.error || 'Failed' } : p
          ));
          return;
        }

        const result = await response.json();
        setProposals(prev => prev.map(p =>
          p.id === item.id ? { ...p, loading: false, proposedText: result.proposed_text || result.text || '' } : p
        ));
      } catch {
        setProposals(prev => prev.map(p =>
          p.id === item.id ? { ...p, loading: false, error: 'Request failed' } : p
        ));
      }
    });
  }, [items]);

  const handleAccept = async (proposal: ProposalState) => {
    const text = editingId === proposal.id ? editText : proposal.proposedText;
    setAccepting(proposal.id);
    try {
      await onAccept(proposal.id, proposal.entityType, text);
      setProposals(prev => prev.filter(p => p.id !== proposal.id));
      if (editingId === proposal.id) setEditingId(null);
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = (proposal: ProposalState) => {
    onReject(proposal.id, proposal.entityType);
    setProposals(prev => prev.filter(p => p.id !== proposal.id));
    if (editingId === proposal.id) setEditingId(null);
  };

  const [acceptingAll, setAcceptingAll] = useState(false);

  const handleAcceptAll = async () => {
    if (acceptingAll) return;
    setAcceptingAll(true);
    try {
      const ready = proposals.filter(p => !p.loading && !p.error && p.proposedText);
      for (const p of ready) {
        await onAccept(p.id, p.entityType, p.proposedText);
      }
      setProposals(prev => prev.filter(p => p.loading || p.error || !p.proposedText));
    } finally {
      setAcceptingAll(false);
    }
  };

  const handleRejectAll = () => {
    proposals.forEach(p => onReject(p.id, p.entityType));
    setProposals([]);
  };

  // Auto-close when all proposals have been handled
  useEffect(() => {
    if (proposals.length === 0 && fetchedRef.current) {
      onClose();
    }
  }, [proposals.length, onClose]);

  if (proposals.length === 0) return null;

  const loadingCount = proposals.filter(p => p.loading).length;
  const readyCount = proposals.filter(p => !p.loading && !p.error).length;

  return (
    <Modal isVisible={true} onClose={onClose} maxWidth="650px">
      <div className="suggestions-header">
        <h3>Review Proposals ({proposals.length})</h3>
      </div>
      {loadingCount > 0 && (
        <p className="suggestions-notice">
          <FontAwesomeIcon icon={faSpinner} spin /> Generating {loadingCount} proposal(s)...
        </p>
      )}
      <div className="suggestions-bulk-actions">
        <button onClick={handleAcceptAll} disabled={readyCount === 0 || acceptingAll}>
          {acceptingAll ? <><FontAwesomeIcon icon={faSpinner} spin /> Applying...</> : <>Accept All ({readyCount})</>}
        </button>
        <button onClick={handleRejectAll} disabled={acceptingAll}>Dismiss All</button>
      </div>
      <div className="suggestions-list">
        {proposals.map((proposal) => (
          <div key={proposal.id} className="suggestion-card bulk-review-card">
            <div className="bulk-review-type">{proposal.entityType}</div>
            <div className="bulk-review-current">
              <span className="bulk-review-label">Current</span>
              <p>{proposal.currentText}</p>
            </div>
            {proposal.loading ? (
              <div className="bulk-review-loading">
                <FontAwesomeIcon icon={faSpinner} spin /> Generating...
              </div>
            ) : proposal.error ? (
              <div className="bulk-review-error">{proposal.error}</div>
            ) : (
              <>
                <div className="bulk-review-proposed">
                  <span className="bulk-review-label">Proposed</span>
                  {editingId === proposal.id ? (
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <p>{proposal.proposedText}</p>
                  )}
                </div>
                <div className="suggestion-actions">
                  <button
                    className="suggestion-accept"
                    onClick={() => handleAccept(proposal)}
                    disabled={accepting === proposal.id}
                  >
                    {accepting === proposal.id
                      ? <><FontAwesomeIcon icon={faSpinner} spin /> Applying...</>
                      : <><FontAwesomeIcon icon={faCheck} /> Accept</>}
                  </button>
                  {editingId === proposal.id ? (
                    <button onClick={() => setEditingId(null)}>Cancel Edit</button>
                  ) : (
                    <button className="suggestion-edit-btn" onClick={() => { setEditingId(proposal.id); setEditText(proposal.proposedText); }}>
                      <FontAwesomeIcon icon={faPen} /> Edit
                    </button>
                  )}
                  <button
                    className="suggestion-reject"
                    onClick={() => handleReject(proposal)}
                    disabled={accepting === proposal.id}
                  >
                    <FontAwesomeIcon icon={faXmark} /> Dismiss
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default BulkReviewPanel;
