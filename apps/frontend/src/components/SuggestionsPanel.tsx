import React, { useState, useEffect } from 'react';
import { markdownRenderer } from '../renderers/MarkdownRenderer';
import Modal from './Modal';
import ReformulationSuggestions, { ReformulationSuggestion } from './ReformulationSuggestions';
import { API_URL } from '../config';
import './SuggestionsPanel.css';

export type Suggestion = {
  text: string;
  source_excerpt?: string;
  related_fact_ids?: string[];
  related_insight_ids?: string[];
  inputId?: string;
  // Research-specific fields
  title?: string;
  summary?: string;
  url?: string;
  justification?: string;
};

export type RelatedItem = { text: string; type: 'input' | 'fact' | 'insight' };

/** Lets each suggestion be reformulated before it is accepted. */
export type SuggestionReformulation = {
  entityType: 'fact' | 'insight' | 'recommendation';
  goal: string;
  relatedItems: (suggestion: Suggestion) => RelatedItem[];
};

type Props = {
  suggestions: Suggestion[];
  inputId: string;
  onAccept: (suggestion: Suggestion, inputId: string) => void;
  onClose: () => void;
  title?: string;
  renderMarkdown?: boolean;
  renderCard?: (suggestion: Suggestion, index: number, actions: { onAccept: () => void; onReject: () => void; onEdit: () => void }) => React.ReactNode;
  notice?: string;
  wide?: boolean;
  reformulation?: SuggestionReformulation;
};

const SuggestionsPanel: React.FC<Props> = ({ suggestions: initialSuggestions, inputId, onAccept, onClose, title = 'Suggested Facts', renderMarkdown = false, renderCard, notice, wide = false, reformulation }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [alternatives, setAlternatives] = useState<ReformulationSuggestion[]>([]);
  const [isReformulating, setIsReformulating] = useState(false);
  const [reformulationFailed, setReformulationFailed] = useState(false);

  const clearReformulation = () => {
    setAlternatives([]);
    setReformulationFailed(false);
  };

  const reformulate = async (suggestion: Suggestion, text: string) => {
    if (!reformulation) return;
    clearReformulation();
    setIsReformulating(true);
    try {
      const response = await fetch(`${API_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          entity_type: reformulation.entityType,
          goal: reformulation.goal,
          related_items: reformulation.relatedItems(suggestion),
        }),
      });
      if (!response.ok) throw new Error('Reformulation failed');
      const data = await response.json();
      setAlternatives(data.suggestions || []);
    } catch {
      setReformulationFailed(true);
    } finally {
      setIsReformulating(false);
    }
  };

  const handleStartReformulate = (index: number) => {
    setEditingIndex(index);
    setEditText(suggestions[index].text);
    reformulate(suggestions[index], suggestions[index].text);
  };

  const handleAccept = (index: number) => {
    onAccept(suggestions[index], inputId);
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleReject = (index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleStartEdit = (index: number) => {
    clearReformulation();
    setEditingIndex(index);
    setEditText(suggestions[index].text);
  };

  const handleConfirmEdit = () => {
    if (editingIndex !== null && editText.trim()) {
      const original = suggestions[editingIndex];
      onAccept({ ...original, text: editText.trim() }, inputId);
      setSuggestions(prev => prev.filter((_, i) => i !== editingIndex));
      setEditingIndex(null);
      setEditText('');
      clearReformulation();
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
    clearReformulation();
  };

  const handleAcceptAll = () => {
    suggestions.forEach(s => onAccept(s, inputId));
    setSuggestions([]);
  };

  const handleRejectAll = () => {
    setSuggestions([]);
  };

  useEffect(() => {
    if (suggestions.length === 0) {
      onClose();
    }
  }, [suggestions.length, onClose]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Modal isVisible={true} onClose={onClose} maxWidth={wide || renderMarkdown ? '700px' : '500px'}>
      <div className="suggestions-header">
        <h3>{title} ({suggestions.length})</h3>
      </div>
      {notice && <p className="suggestions-notice">{notice}</p>}
      <div className="suggestions-bulk-actions">
        <button onClick={handleAcceptAll}>Accept All</button>
        <button onClick={handleRejectAll}>Reject All</button>
      </div>
      <div className="suggestions-list">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="suggestion-card">
            {renderCard ? (
              renderCard(suggestion, index, {
                onAccept: () => handleAccept(index),
                onReject: () => handleReject(index),
                onEdit: () => handleStartEdit(index),
              })
            ) : editingIndex === index ? (
              <div className="suggestion-edit">
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={3}
                />
                {reformulationFailed && (
                  <p className="suggestion-reformulation-error">Reformulation failed. Try again.</p>
                )}
                <ReformulationSuggestions
                  suggestions={alternatives}
                  onSelect={(text) => { setEditText(text); setAlternatives([]); }}
                  onDismiss={() => setAlternatives([])}
                />
                <div className="suggestion-edit-actions">
                  <button onClick={handleConfirmEdit}>Confirm</button>
                  {reformulation && (
                    <button
                      className="suggestion-reformulate"
                      disabled={!editText.trim() || isReformulating}
                      onClick={() => reformulate(suggestion, editText)}
                    >
                      {isReformulating ? 'Reformulating…' : 'Reformulate'}
                    </button>
                  )}
                  <button onClick={handleCancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {renderMarkdown ? (
                  <div className="suggestion-text suggestion-markdown">{markdownRenderer.render(suggestion.text)}</div>
                ) : (
                  <p className="suggestion-text">{suggestion.text}</p>
                )}
                {suggestion.source_excerpt && (
                  <div className="suggestion-excerpt">{markdownRenderer.render(suggestion.source_excerpt)}</div>
                )}
                <div className="suggestion-actions">
                  <button className="suggestion-accept" onClick={() => handleAccept(index)}>Accept</button>
                  <button className="suggestion-edit-btn" onClick={() => handleStartEdit(index)}>Edit</button>
                  {reformulation && (
                    <button className="suggestion-reformulate" onClick={() => handleStartReformulate(index)}>Reformulate</button>
                  )}
                  <button className="suggestion-reject" onClick={() => handleReject(index)}>Reject</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default SuggestionsPanel;
