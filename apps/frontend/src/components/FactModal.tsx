import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlus, faTrashCan, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

type Props = {
  mode: 'add' | 'edit';
  isDialogVisible: boolean;
  closeDialog: () => void;
  saveFact: (factData: FactType) => void;
  deleteFact: (factId: string) => void;
  factData: FactType | null;
  inputs: InputType[] | null;
};

const FactModal: React.FC<Props> = ({
  mode,
  isDialogVisible,
  closeDialog,
  saveFact,
  deleteFact,
  factData,
  inputs
}) => {
  const [currentFactText, setCurrentFactText] = useState("");
  const [currentFactRelatedInputs, setCurrentRelatedInputs] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (factData) {
      setCurrentFactText(factData.text);
      setCurrentRelatedInputs(factData.related_inputs);
    } else {
      setCurrentFactText('');
      setCurrentRelatedInputs([]);
    }
    setConfirmDelete(false);
  }, [mode, factData]);

  const handleSave = () => {
    const newFactData: FactType = {
      fact_id: factData ? factData.fact_id : "",
      text: currentFactText,
      related_inputs: currentFactRelatedInputs,
    };
    saveFact(newFactData);
    closeDialog();
  };

  const handleDelete = () => {
    if (factData && factData.fact_id) {
      deleteFact(factData.fact_id);
      closeDialog();
    }
  };

  return (
    <Modal isVisible={isDialogVisible} onClose={closeDialog}>
      {confirmDelete ? (
        <>
          <p style={{ margin: '0 0 1em' }}>Are you sure you want to delete this fact?</p>
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
          <h2>{mode === 'add' ? 'Add Fact' : 'Edit Fact'}</h2>
          <form>
            <label htmlFor="fact-text">Text</label>
            <textarea
              id="fact-text"
              rows={5}
              value={currentFactText}
              required
              onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => {
                setCurrentFactText(event.target.value);
              }} />
            <label htmlFor="fact-related-inputs">Related Inputs</label>
            <select
              id="fact-related-inputs"
              value={currentFactRelatedInputs}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                const selectedOptions = Array.from(event.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
                setCurrentRelatedInputs(selectedOptions);
              }} multiple>
              {inputs ? inputs.map((input) => (<option key={input.input_id} value={input.input_id}>{input.title}</option>)) : ""}
            </select>

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

export default FactModal;
