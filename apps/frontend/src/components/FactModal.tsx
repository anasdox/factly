import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlus, faTrashCan, faFloppyDisk, faWandMagicSparkles, faSpinner } from '@fortawesome/free-solid-svg-icons';
import ReformulationSuggestions, { ReformulationSuggestion } from './ReformulationSuggestions';
import { API_URL } from '../config';

type Props = {
  mode: 'add' | 'edit';
  isDialogVisible: boolean;
  closeDialog: () => void;
  saveFact: (factData: FactType) => void;
  deleteFact: (factId: string) => void;
  factData: FactType | null;
  inputs: InputType[] | null;
  backendAvailable?: boolean;
  goal?: string;
};

const FactModal: React.FC<Props> = ({
  mode,
  isDialogVisible,
  closeDialog,
  saveFact,
  deleteFact,
  factData,
  inputs,
  backendAvailable,
  goal,
}) => {
  const [currentFactText, setCurrentFactText] = useState("");
  const [currentFactRelatedInputs, setCurrentRelatedInputs] = useState<string[]>([]);
  const [currentWeight, setCurrentWeight] = useState<number | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggestions, setSuggestions] = useState<ReformulationSuggestion[]>([]);
  const [isReformulating, setIsReformulating] = useState(false);

  useEffect(() => {
    if (factData) {
      setCurrentFactText(factData.text);
      setCurrentRelatedInputs(factData.related_inputs);
      setCurrentWeight(factData.weight);
    } else {
      setCurrentFactText('');
      setCurrentRelatedInputs([]);
      setCurrentWeight(undefined);
    }
    setConfirmDelete(false);
    setSuggestions([]);
  }, [mode, factData, isDialogVisible]);

  const handleSave = () => {
    const newFactData: FactType = {
      fact_id: factData ? factData.fact_id : "",
      text: currentFactText,
      related_inputs: currentFactRelatedInputs,
      weight: currentWeight,
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

  const handleReformulate = async () => {
    setIsReformulating(true);
    setSuggestions([]);
    try {
      const relatedItems = (inputs || [])
        .filter(inp => currentFactRelatedInputs.includes(inp.input_id))
        .map(inp => ({ text: inp.text || inp.title, type: 'input' }));

      const response = await fetch(`${API_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentFactText,
          entity_type: 'fact',
          goal: goal || '',
          related_items: relatedItems,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Reformulation failed');
      }
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch {
      // Silently handle — user can retry
    } finally {
      setIsReformulating(false);
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
            {backendAvailable && (
              <div className="reformulate-button-wrapper">
                <button
                  type="button"
                  className="modal-action-reformulate"
                  disabled={!currentFactText.trim() || isReformulating}
                  onClick={handleReformulate}
                  title={!currentFactText.trim() ? 'Enter text first' : 'Suggest alternative wordings'}
                >
                  <FontAwesomeIcon icon={isReformulating ? faSpinner : faWandMagicSparkles} spin={isReformulating} /> Reformulate
                </button>
              </div>
            )}
            <ReformulationSuggestions
              suggestions={suggestions}
              onSelect={(text) => { setCurrentFactText(text); setSuggestions([]); }}
              onDismiss={() => setSuggestions([])}
            />
            <label htmlFor="fact-weight">Weight ({currentWeight ?? '—'}/10)</label>
            <input
              id="fact-weight"
              type="range"
              min={0}
              max={10}
              value={currentWeight ?? 5}
              onChange={(e) => setCurrentWeight(Number(e.target.value))}
            />
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
