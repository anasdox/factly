import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlus, faTrashCan, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

type Props = {
  mode: 'add' | 'edit';
  isDialogVisible: boolean;
  closeDialog: () => void;
  saveInput: (inputData: InputType) => void;
  deleteInput: (inputId: string) => void;
  inputData: InputType | null;
};

const InputModal: React.FC<Props> = ({
  mode,
  isDialogVisible,
  closeDialog,
  saveInput,
  deleteInput,
  inputData,
}) => {
  const [currentInputTitle, setCurrentInputTitle] = useState('');
  const [currentInputType, setCurrentInputType] = useState('text');
  const [currentInputUrl, setCurrentInputUrl] = useState('');
  const [currentInputText, setCurrentInputText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && inputData) {
      setCurrentInputTitle(inputData.title);
      setCurrentInputType(inputData.type);
      setCurrentInputUrl(inputData.url ? inputData.url : '' );
      setCurrentInputText(inputData.text ? inputData.text : '');
    } else {
      setCurrentInputTitle('');
      setCurrentInputType('text');
      setCurrentInputUrl('');
      setCurrentInputText('');
    }
    setConfirmDelete(false);
  }, [mode, inputData]);

  const handleSave = () => {
    const newInputData: InputType = {
      input_id: inputData ? inputData.input_id : "",
      title: currentInputTitle,
      type: currentInputType,
      url: currentInputUrl,
      text: currentInputText
    };
    saveInput(newInputData);
    closeDialog();
  };

  const handleDelete = () => {
    if (inputData && inputData.input_id) {
      deleteInput(inputData.input_id);
      closeDialog();
    }
  };

  return (
    <Modal isVisible={isDialogVisible} onClose={closeDialog}>
      {confirmDelete ? (
        <>
          <p style={{ margin: '0 0 1em' }}>Are you sure you want to delete this input?</p>
          <div className="modal-actions">
            <div className="modal-action-group-left">
              <button className="modal-action-save" onClick={handleDelete}>Confirm</button>
            </div>
            <div className="modal-action-group-right">
              <button className="modal-action-close" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <h2>{mode === 'add' ? 'Add Input' : 'Edit Input'}</h2>
          <form>
            <label htmlFor="input-title">Title</label>
            <input
              id="input-title"
              type="text"
              value={currentInputTitle}
              onChange={(event) => {
                setCurrentInputTitle(event.target.value);
              }} />
            <label htmlFor="input-type">Type</label>
            <select
              id="input-type"
              value={currentInputType}
              onChange={(event) => {
                setCurrentInputType(event.target.value);
              }}>
              <option value="text">Text</option>
              <option value="web">Web</option>
            </select>
            {currentInputType === 'text' ? (
              <>
                <label htmlFor="input-text">Text</label>
                <textarea
                  id="input-text"
                  rows={5}
                  value={currentInputText}
                  onChange={(event) => {
                    setCurrentInputText(event.target.value);
                  }} />
              </>
            ) : (
              <>
                <label htmlFor="input-url">URL</label>
                <input
                  id="input-url"
                  type="text"
                  value={currentInputUrl}
                  onChange={(event) => {
                    setCurrentInputUrl(event.target.value);
                  }} />
              </>
            )}
          </form>
          <div className='modal-actions'>
            <div className="modal-action-group-left">
              <button className='modal-action-close' onClick={closeDialog}><FontAwesomeIcon icon={faXmark} /> Cancel</button>
              {mode === 'edit' &&
                <button className='modal-action-delete' onClick={() => setConfirmDelete(true)}><FontAwesomeIcon icon={faTrashCan} /> Delete</button>
              }
            </div>
            <div className="modal-action-group-right">
              <button className='modal-action-save' onClick={handleSave}>{mode === 'add' ? <><FontAwesomeIcon icon={faPlus} /> Add</> : <><FontAwesomeIcon icon={faFloppyDisk} /> Save</>}</button>

            </div>
          </div>
        </>
      )}
    </Modal>
  );
};

export default InputModal;
