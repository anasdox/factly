import React, { useState } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faXmark } from '@fortawesome/free-solid-svg-icons';

const OUTPUT_TYPES = [
  { value: 'report', label: 'Report' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'action_plan', label: 'Action Plan' },
  { value: 'brief', label: 'Brief' },
] as const;

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (config: { outputType: OutputType['type'] }) => void;
  inputCount: number;
};

const FullAutoConfigModal: React.FC<Props> = ({ isVisible, onClose, onConfirm, inputCount }) => {
  const [outputType, setOutputType] = useState<OutputType['type']>('report');

  const handleRun = () => {
    onConfirm({ outputType });
  };

  return (
    <Modal isVisible={isVisible} onClose={onClose} maxWidth="400px">
      <h2>Full Auto Pipeline</h2>
      <p style={{ margin: '0.5em 0 1em' }}>
        Run the entire AI pipeline on <strong>{inputCount} input{inputCount !== 1 ? 's' : ''}</strong>: extract facts, derive insights, generate recommendations, and formulate an output.
      </p>
      <form>
        <label htmlFor="full-auto-output-type">Output Type</label>
        <select
          id="full-auto-output-type"
          value={outputType}
          onChange={(e) => setOutputType(e.target.value as OutputType['type'])}
        >
          {OUTPUT_TYPES.map(ot => (
            <option key={ot.value} value={ot.value}>{ot.label}</option>
          ))}
        </select>
      </form>
      <div className="modal-actions">
        <div className="modal-action-group-left">
          <button className="modal-action-save" onClick={handleRun} disabled={inputCount === 0}>
            <FontAwesomeIcon icon={faRocket} /> Run
          </button>
        </div>
        <div className="modal-action-group-right">
          <button className="modal-action-close" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} /> Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FullAutoConfigModal;
