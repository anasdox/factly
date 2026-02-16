import React from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faUndo } from '@fortawesome/free-solid-svg-icons';

type FullAutoStats = {
  facts: number;
  insights: number;
  recommendations: number;
  outputs: number;
};

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onUndo: () => void;
  stats: FullAutoStats;
  error?: string;
};

const FullAutoSummaryModal: React.FC<Props> = ({ isVisible, onClose, onUndo, stats, error }) => {
  return (
    <Modal isVisible={isVisible} onClose={onClose} maxWidth="420px">
      <h2>{error ? 'Full Auto Stopped' : 'Full Auto Complete'}</h2>
      {error && (
        <p style={{ color: 'var(--color-error, #c0392b)', margin: '0.5em 0' }}>{error}</p>
      )}
      <table style={{ width: '100%', margin: '1em 0', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td style={{ padding: '0.3em 0' }}>Facts</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{stats.facts}</td></tr>
          <tr><td style={{ padding: '0.3em 0' }}>Insights</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{stats.insights}</td></tr>
          <tr><td style={{ padding: '0.3em 0' }}>Recommendations</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{stats.recommendations}</td></tr>
          <tr><td style={{ padding: '0.3em 0' }}>Outputs</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{stats.outputs}</td></tr>
        </tbody>
      </table>
      <div className="modal-actions">
        <div className="modal-action-group-left">
          <button className="modal-action-save" onClick={onClose}>
            <FontAwesomeIcon icon={faCheck} /> Keep Results
          </button>
        </div>
        <div className="modal-action-group-right">
          <button className="modal-action-close" onClick={onUndo}>
            <FontAwesomeIcon icon={faUndo} /> Undo All
          </button>
        </div>
      </div>
    </Modal>
  );
};

export type { FullAutoStats };
export default FullAutoSummaryModal;
