import { useState } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

type Props = {
  isDialogVisible: boolean;
  closeDialog: () => void;
  roomId: string;
};


const StartEventRoomModal = ({ isDialogVisible, closeDialog, roomId }: Props) => {
  const [copied, setCopied] = useState(false);
  const roomUrl = `${window.location.origin}?room=${roomId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal isVisible={isDialogVisible} onClose={closeDialog}>
      <h2>Create Event Room</h2>
      <form style={{ paddingTop: '12px' }}>
        <label>Room URL</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="text" value={roomUrl} readOnly style={{ flex: 1, margin: 0 }} />
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

export default StartEventRoomModal;
