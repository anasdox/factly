import React, { useEffect, useState } from 'react';
import ModalDialog from 'react-basic-modal-dialog';

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

  useEffect(() => {
    if (mode === 'edit' && factData) {
      setCurrentFactText(factData.text);
      setCurrentRelatedInputs(factData.related_inputs);
    } else {
      setCurrentFactText('');
      setCurrentRelatedInputs([]);
    }
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
    <ModalDialog isDialogVisible={isDialogVisible} closeDialog={closeDialog}>
        <h2>{mode === 'add'? 'Add Fact' : 'Edit Fact'}</h2>
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
      <button onClick={closeDialog}>Close</button>
      <button onClick={handleSave}>{mode === 'add' ? 'Add' : 'Save'}</button>
      {mode === 'edit' && <button onClick={handleDelete}>Delete</button>}
    </ModalDialog>
  );
};

export default FactModal;
