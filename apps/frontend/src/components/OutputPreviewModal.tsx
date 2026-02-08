import React from 'react';
import ModalDialog from 'react-basic-modal-dialog';
import { markdownRenderer } from '../renderers/MarkdownRenderer';
import './OutputItem.css';

type Props = {
  isVisible: boolean;
  onClose: () => void;
  content: string;
  outputType?: string;
};

const TYPE_LABELS: Record<string, string> = {
  report: 'Report',
  presentation: 'Presentation',
  action_plan: 'Action Plan',
  brief: 'Brief',
};

const OutputPreviewModal: React.FC<Props> = ({ isVisible, onClose, content, outputType }) => {
  return (
    <ModalDialog isDialogVisible={isVisible} closeDialog={onClose}>
      <div className="output-preview-modal">
        <div className="output-preview-header">
          <h2>{outputType ? TYPE_LABELS[outputType] || outputType : 'Output'} Preview</h2>
          <button className="output-preview-close" onClick={onClose}>&times;</button>
        </div>
        <div className="output-preview-content markdown-body">
          {markdownRenderer.render(content)}
        </div>
      </div>
    </ModalDialog>
  );
};

export default OutputPreviewModal;
