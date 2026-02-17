import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { markdownRenderer } from '../renderers/MarkdownRenderer';

type Props = {
  currentText: string;
  proposedText: string;
  explanation?: string;
  loading?: boolean;
  overlay?: boolean;
  renderMarkdown?: boolean;
  onAccept: (text: string) => void | Promise<void>;
  onReject: () => void;
};

const ProposalPanel: React.FC<Props> = ({
  currentText,
  proposedText,
  explanation,
  loading,
  overlay,
  renderMarkdown,
  onAccept,
  onReject,
}) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(proposedText);
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept(editing ? editText : proposedText);
    } finally {
      setAccepting(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setEditText(proposedText);
  };

  const renderText = (text: string) => {
    if (renderMarkdown) {
      return <div className="proposal-markdown">{markdownRenderer.render(text)}</div>;
    }
    return <p>{text}</p>;
  };

  const content = (
    <div className="proposal-panel" onClick={overlay ? (e) => e.stopPropagation() : undefined}>
      <h3>AI Update Proposal</h3>
      {loading ? (
        <div className="proposal-loading">
          <FontAwesomeIcon icon={faSpinner} spin /> Generating proposal...
        </div>
      ) : (
        <>
          <div className="proposal-comparison">
            <div>
              <h4>Current text</h4>
              {renderText(currentText)}
            </div>
            <div>
              <h4>Proposed text</h4>
              {editing ? (
                <textarea
                  className="proposal-edit-textarea"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                />
              ) : (
                renderText(proposedText)
              )}
            </div>
          </div>
          {explanation && <div className="proposal-explanation">{explanation}</div>}
          <div className="proposal-actions">
            {editing ? (
              <button onClick={handleAccept} disabled={accepting}>
                {accepting ? <><FontAwesomeIcon icon={faSpinner} spin /> Applying...</> : 'Confirm'}
              </button>
            ) : (
              <>
                <button onClick={handleAccept} disabled={accepting}>
                  {accepting ? <><FontAwesomeIcon icon={faSpinner} spin /> Applying...</> : 'Accept'}
                </button>
                <button onClick={handleEdit} disabled={accepting}>Edit</button>
              </>
            )}
            <button onClick={onReject} disabled={accepting}>Reject</button>
          </div>
        </>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="proposal-panel-overlay" onClick={onReject}>
        {content}
      </div>
    );
  }

  return content;
};

export default ProposalPanel;
