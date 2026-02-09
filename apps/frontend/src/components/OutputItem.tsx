import React, { useState } from 'react';
import OutputPreviewModal from './OutputPreviewModal';
import './OutputItem.css';

type Props = {
  output: OutputType;
};

const TYPE_LABELS: Record<string, string> = {
  report: 'Report',
  presentation: 'Presentation',
  action_plan: 'Action Plan',
  brief: 'Brief',
};

const OutputItem: React.FC<Props> = ({ output }) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="output-item item" onClick={() => setPreviewOpen(true)} title="Click to preview">
      {output.type && <span className="output-type-badge">{TYPE_LABELS[output.type] || output.type}</span>}
      <span className="output-text">{output.text.length > 150 ? output.text.slice(0, 150) + '...' : output.text}</span>
      <OutputPreviewModal
        isVisible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        content={output.text}
        outputType={output.type}
      />
    </div>
  );
};

export default OutputItem;
