import React from 'react';

type DuplicateGroup = {
  type: 'fact' | 'insight' | 'recommendation';
  explanation: string;
  items: { id: string; text: string }[];
};

type Props = {
  groups: DuplicateGroup[];
  onMergeGroup: (group: DuplicateGroup) => void;
  onKeepGroup: (group: DuplicateGroup) => void;
  onClose: () => void;
};

const DedupScanResultsPanel: React.FC<Props> = ({ groups, onMergeGroup, onKeepGroup, onClose }) => {
  if (groups.length === 0) return null;

  const typeLabel = (type: string) => {
    switch (type) {
      case 'fact': return 'Fact';
      case 'insight': return 'Insight';
      case 'recommendation': return 'Recommendation';
      default: return type;
    }
  };

  return (
    <div className="dedup-results-overlay" onClick={onClose}>
      <div className="dedup-results-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Duplicate Scan Results</h3>
        <p>{groups.length} duplicate group(s) found.</p>
        {groups.map((group, idx) => (
          <div key={idx} className="dedup-group">
            <div className="dedup-group-header">
              <strong>{typeLabel(group.type)}</strong>
              {group.explanation && <span> — {group.explanation}</span>}
            </div>
            <ul>
              {group.items.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
            <div className="dedup-group-actions">
              <button onClick={() => onMergeGroup(group)}>Merge (keep first)</button>
              <button onClick={() => onKeepGroup(group)}>Keep all</button>
            </div>
          </div>
        ))}
        <div className="dedup-results-close">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export type { DuplicateGroup };
export default DedupScanResultsPanel;
