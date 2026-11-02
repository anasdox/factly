import { useState } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

type Props = {
  isDialogVisible: boolean;
  closeDialog: () => void;
  documentId: string;
};

const COPIED_FEEDBACK_MS = 2000;

const ShareModal = ({ isDialogVisible, closeDialog, documentId }: Props) => {
  const [copied, setCopied] = useState(false);
  const discoveryLink = `${window.location.origin}/documents/${documentId}`;

  // No clipboard (insecure context, permission denied): the field stays
  // selectable for a manual copy.
  const handleCopy = () => {
    navigator.clipboard?.writeText(discoveryLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    }).catch(() => {});
  };

  return (
    <Modal isVisible={isDialogVisible} onClose={closeDialog}>
      <h2>Share Discovery</h2>
      <form style={{ paddingTop: '12px' }} onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="share-discovery-link">Discovery link</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            id="share-discovery-link"
            type="text"
            value={discoveryLink}
            readOnly
            onFocus={(e) => e.target.select()}
            style={{ flex: 1, margin: 0 }}
          />
          <button
            type="button"
            title={copied ? 'Copied!' : 'Copy link'}
            aria-label={copied ? 'Copied!' : 'Copy link'}
            onClick={handleCopy}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <FontAwesomeIcon
              icon={copied ? faCheck : faCopy}
              style={{ color: copied ? 'var(--color-suggestion-accept)' : 'var(--text-secondary)' }}
            />
          </button>
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

export default ShareModal;
