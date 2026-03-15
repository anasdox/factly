import { useState } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

type Props = {
  isDialogVisible: boolean;
  closeDialog: () => void;
  documentId: string;
};


const StartShareModal = ({ isDialogVisible, closeDialog, documentId }: Props) => {
  const [copied, setCopied] = useState(false);
  const documentUrl = `${window.location.origin}/documents/${documentId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(documentUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal isVisible={isDialogVisible} onClose={closeDialog}>
      <h2>Document Saved</h2>
      <form style={{ paddingTop: '12px' }}>
        <label>Document URL</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="text" value={documentUrl} readOnly style={{ flex: 1, margin: 0 }} />
          <FontAwesomeIcon
            icon={copied ? faCheck : faCopy}
            style={{ cursor: 'pointer', color: copied ? 'var(--color-suggestion-accept)' : 'var(--text-secondary)' }}
            title={copied ? 'Copied!' : 'Copy URL'}
            onClick={handleCopy}
          />
        </div>
      </form>
      <div className='modal-actions'>
        <div className="modal-action-group-right">
          <button className='modal-action-close' onClick={closeDialog}><FontAwesomeIcon icon={faXmark} /> Close</button>
        </div>
      </div>
    </Modal>
  );
};

export default StartShareModal;
