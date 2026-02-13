import React from 'react';

type Props = {
  isVisible: boolean;
  newText: string;
  existingItem: { id: string; text: string; similarity: number; explanation?: string };
  onMerge: () => void;
  onKeepAsVariant: () => void;
  onForceAdd: () => void;
  onClose: () => void;
};

const MergeDialog: React.FC<Props> = ({
  isVisible,
  newText,
  existingItem,
  onMerge,
  onKeepAsVariant,
  onForceAdd,
  onClose,
}) => {
  if (!isVisible) return null;

  return (
    <div className="merge-dialog-overlay" onClick={onClose}>
      <div className="merge-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Similar item detected</h3>
        <div className="merge-dialog-comparison">
          <div>
            <h4>New item</h4>
            <p>{newText}</p>
          </div>
          <div>
            <h4>Existing item</h4>
            <p>{existingItem.text}</p>
          </div>
        </div>
        <div className="merge-dialog-similarity">
          Similarity: {Math.round(existingItem.similarity * 100)}%
          {existingItem.explanation && ` — ${existingItem.explanation}`}
        </div>
        <div className="merge-dialog-actions">
          <button onClick={onMerge}>Merge into existing</button>
          <button onClick={onKeepAsVariant}>Keep as variant</button>
          <button onClick={onForceAdd}>Force add</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default MergeDialog;
