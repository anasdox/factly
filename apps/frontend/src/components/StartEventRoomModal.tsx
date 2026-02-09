import { useState } from 'react';
import ModalDialog from 'react-basic-modal-dialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

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

  return isDialogVisible ? (
    <ModalDialog isDialogVisible={isDialogVisible} closeDialog={closeDialog}>
      <div className="modal-content">
        <h2>Create Event Room</h2>
        <form>
          <label>Room URL</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="text" value={roomUrl} readOnly style={{ flex: 1 }} />
            <FontAwesomeIcon
              icon={copied ? faCheck : faCopy}
              style={{ cursor: 'pointer', color: copied ? 'var(--color-suggestion-accept)' : 'var(--text-secondary)' }}
              title={copied ? 'Copied!' : 'Copy URL'}
              onClick={handleCopy}
            />
          </div>
          <button onClick={closeDialog}>Close</button>
        </form>

      </div>
    </ModalDialog>
  ) : null;
};

export default StartEventRoomModal;
