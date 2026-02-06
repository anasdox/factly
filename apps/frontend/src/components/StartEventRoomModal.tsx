import ModalDialog from 'react-basic-modal-dialog';

type Props = {
  isDialogVisible: boolean;
  closeDialog: () => void;
  roomId: string;
};


const StartEventRoomModal = ({ isDialogVisible, closeDialog, roomId }: Props) => {

  return isDialogVisible ? (
    <ModalDialog isDialogVisible={isDialogVisible} closeDialog={closeDialog}>
      <div className="modal-content">
        <h2>Create Event Room</h2>
        <form>
          <label>Room URL</label>
          <input type="text" value={`${window.location.origin}?room=${roomId}`} readOnly />
          <button onClick={closeDialog}>Close</button>
        </form>

      </div>
    </ModalDialog>
  ) : null;
};

export default StartEventRoomModal;
