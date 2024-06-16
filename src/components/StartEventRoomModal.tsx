import ModalDialog from 'react-basic-modal-dialog';

type Props = {
  isDialogVisible: boolean;
  closeDialog: () => void;
  roomId: string;
  username: string;
  setUsername: (username:string) => void;
};


const StartEventRoomModal = ({ isDialogVisible, closeDialog, roomId, username, setUsername }: Props) => {

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    window.location.href = `${window.location.origin}?room=${roomId}&username=${username}`;
  };

  return isDialogVisible ? (
    <ModalDialog isDialogVisible={isDialogVisible} closeDialog={closeDialog}>
      <div className="modal-content">
        <h2>Create Event Room</h2>
        <form>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label>Room URL</label>
            <input type="text" value={`${window.location.origin}?room=${roomId}`} readOnly />
            <button onClick={handleSubmit}>Create Room</button>
          <button onClick={closeDialog}>Close</button>
        </form>

      </div>
    </ModalDialog>
  ) : null;
};

export default StartEventRoomModal;
