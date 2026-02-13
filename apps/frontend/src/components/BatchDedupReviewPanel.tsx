import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { PendingDedupEntry, DedupResolution } from '../hooks/useBatchDedupQueue';

type Props<T> = {
  entries: PendingDedupEntry<T>[];
  inflight: number;
  getText: (item: T) => string;
  onResolve: (id: string, resolution: DedupResolution) => void;
  onResolveAll: (resolution: DedupResolution) => void;
  onApply: () => void;
  onClose: () => void;
};

function BatchDedupReviewPanel<T>({
  entries,
  inflight,
  getText,
  onResolve,
  onResolveAll,
  onApply,
  onClose,
}: Props<T>) {
  const hasUnresolved = entries.some(e => e.resolution === 'pending');
  const applyDisabled = hasUnresolved || inflight > 0;

  return (
    <div className="batch-dedup-overlay" onClick={onClose}>
      <div className="batch-dedup-panel" onClick={e => e.stopPropagation()}>
        <h3>Duplicate Review ({entries.length} item{entries.length !== 1 ? 's' : ''})</h3>

        {inflight > 0 && (
          <p className="batch-dedup-loading">
            <FontAwesomeIcon icon={faSpinner} spin /> Checking {inflight} more item{inflight !== 1 ? 's' : ''} for duplicates...
          </p>
        )}

        <div className="batch-dedup-bulk-actions">
          <button onClick={() => onResolveAll('merge')}>Merge All</button>
          <button onClick={() => onResolveAll('keep')}>Keep All</button>
          <button onClick={() => onResolveAll('force')}>Force All</button>
        </div>

        <div className="batch-dedup-entries">
          {entries.map(entry => (
            <div key={entry.id} className="batch-dedup-entry">
              <div className="batch-dedup-comparison">
                <div>
                  <h4>New item</h4>
                  <p>{getText(entry.pendingItem)}</p>
                </div>
                <div>
                  <h4>Existing item</h4>
                  <p>{entry.match.text}</p>
                </div>
              </div>
              <div className="batch-dedup-similarity">
                Similarity: {Math.round(entry.match.similarity * 100)}%
                {entry.match.explanation && ` — ${entry.match.explanation}`}
              </div>
              <div className="batch-dedup-actions">
                <button
                  className={entry.resolution === 'merge' ? 'selected' : ''}
                  onClick={() => onResolve(entry.id, 'merge')}
                >Merge</button>
                <button
                  className={entry.resolution === 'keep' ? 'selected' : ''}
                  onClick={() => onResolve(entry.id, 'keep')}
                >Keep as variant</button>
                <button
                  className={entry.resolution === 'force' ? 'selected' : ''}
                  onClick={() => onResolve(entry.id, 'force')}
                >Force add</button>
              </div>
            </div>
          ))}
        </div>

        <div className="batch-dedup-footer">
          <button onClick={onClose}>Discard</button>
          <button disabled={applyDisabled} onClick={onApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchDedupReviewPanel;
