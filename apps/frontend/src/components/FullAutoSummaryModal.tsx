import React from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faUndo } from '@fortawesome/free-solid-svg-icons';

type FullAutoStats = {
  facts: number;
  insights: number;
  recommendations: number;
  outputs: number;
  skippedFacts?: number;
  skippedInsights?: number;
  skippedRecommendations?: number;
};

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onUndo: () => void;
  stats: FullAutoStats;
  error?: string;
};

const skippedLabel = (count?: number) =>
  count ? <span style={{ color: 'var(--color-muted, #888)', fontSize: '0.85em' }}> ({count} skipped)</span> : null;

const FullAutoSummaryModal: React.FC<Props> = ({ isVisible, onClose, onUndo, stats, error }) => {
  const totalSkipped = (stats.skippedFacts || 0) + (stats.skippedInsights || 0) + (stats.skippedRecommendations || 0);
  return (
    <Modal isVisible={isVisible} onClose={onClose} maxWidth="420px">
      <h2>{error ? 'Full Auto Stopped' : 'Full Auto Complete'}</h2>
      {error && (
        <p style={{ color: 'var(--color-error, #c0392b)', margin: '0.5em 0' }}>{error}</p>
      )}
      <table style={{ width: '100%', margin: '1em 0', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td style={{ padding: '0.3em 0' }}>Facts</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{stats.facts}{skippedLabel(stats.skippedFacts)}</td></tr>
          <tr><td style={{ padding: '0.3em 0' }}>Insights</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{stats.insights}{skippedLabel(stats.skippedInsights)}</td></tr>
          <tr><td style={{ padding: '0.3em 0' }}>Recommendations</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{stats.recommendations}{skippedLabel(stats.skippedRecommendations)}</td></tr>
          <tr><td style={{ padding: '0.3em 0' }}>Outputs</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{stats.outputs}</td></tr>
        </tbody>
      </table>
      {totalSkipped > 0 && (
        <p style={{ color: 'var(--color-muted, #888)', fontSize: '0.85em', margin: '0 0 0.5em' }}>
          {totalSkipped} duplicate(s) were automatically skipped.
        </p>
      )}
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
