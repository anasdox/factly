import React, { useEffect, useState } from 'react';
import ModalDialog from 'react-basic-modal-dialog';

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

  useEffect(() => {
    if (mode === 'edit' && inputData) {
      setCurrentInputTitle(inputData.title);
      setCurrentInputType(inputData.type);
      setCurrentInputUrl(inputData.url);
    } else {
      setCurrentInputTitle('');
      setCurrentInputType('text');
      setCurrentInputUrl('');
    }
  }, [mode, inputData]);

  const handleSave = () => {
    const newInputData: InputType = {
      input_id: inputData ? inputData.input_id : "",
      title: currentInputTitle,
      type: currentInputType,
      url: currentInputUrl,
    };
    saveInput(newInputData);
    closeDialog();
  };


  const handleDelete = () => {
    if (inputData && inputData.input_id && window.confirm('Are you sure you want to delete this input?')) {
      deleteInput(inputData.input_id);
      closeDialog();
    }
  };

  return (
    <ModalDialog isDialogVisible={isDialogVisible} closeDialog={closeDialog}>
      <h2>{mode === 'add' ? 'Add Input' : 'Edit Input'}</h2>
      <form>
        <label htmlFor="input-title">Title</label>
        <input
          id="input-title"
          type="text"
          value={currentInputTitle}
          onChange={
            (event: { target: { value: React.SetStateAction<string>; }; }) => {
              setCurrentInputTitle(event.target.value);
            }} />
        <label htmlFor="input-url">URL</label>
        <input
          id="input-url"
          type="text"
          value={currentInputUrl}
          onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => {
            setCurrentInputUrl(event.target.value);
          }} />
        <label htmlFor="input-type">Type</label>
        <select
          id="input-type"
          value={currentInputType}
          onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => {
            setCurrentInputType(event.target.value);
          }}>
          <option value="text">Text</option>
          <option value="web">Web</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="pdf">Pdf</option>
        </select>
      </form>
      <div className='modal-actions'>
        <div className="modal-action-group-left">
          <button className='modal-action-close' onClick={closeDialog}>🗙Cancel</button>
          {mode === 'edit' &&
            <button className='modal-action-delete' onClick={handleDelete}>🗑️Delete</button>
          }
        </div>
        <div className="modal-action-group-right">
          <button className='modal-action-save' onClick={handleSave}>{mode === 'add' ? '➕Add' : '💾Save'}</button>

        </div>
      </div>
    </ModalDialog>
  );
};

export default InputModal;
