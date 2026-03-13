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
  saveInsight: (insightData: InsightType) => void;
  deleteInsight: (insightId: string) => void;
  insightData: InsightType | null;
  facts: FactType[] | null;
  backendAvailable?: boolean;
  goal?: string;
};

const InsightModal: React.FC<Props> = ({
  mode,
  isDialogVisible,
  closeDialog,
  saveInsight,
  deleteInsight,
  insightData,
  facts,
  backendAvailable,
  goal,
}) => {
  const [currentInsightText, setCurrentInsightText] = useState("");
  const [currentInsightRelatedFacts, setCurrentRelatedFacts] = useState<string[]>([]);
  const [currentWeight, setCurrentWeight] = useState<number | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggestions, setSuggestions] = useState<ReformulationSuggestion[]>([]);
  const [isReformulating, setIsReformulating] = useState(false);

  useEffect(() => {
    if (insightData) {
      setCurrentInsightText(insightData.text || '');
      setCurrentRelatedFacts(insightData.related_facts || []);
      setCurrentWeight(insightData.weight);
    } else {
      setCurrentInsightText('');
      setCurrentRelatedFacts([]);
      setCurrentWeight(undefined);
    }
    setConfirmDelete(false);
    setSuggestions([]);
  }, [mode, insightData, isDialogVisible]);

  const handleSave = () => {
    const newInsightData: InsightType = {
      insight_id: insightData ? insightData.insight_id : Math.random().toString(16).slice(2),
      text: currentInsightText,
      related_facts: currentInsightRelatedFacts,
      weight: currentWeight,
    };
    saveInsight(newInsightData);
    closeDialog();
  };

  const handleDelete = () => {
    if (insightData && insightData.insight_id) {
      deleteInsight(insightData.insight_id);
      closeDialog();
    }
  };

  const handleReformulate = async () => {
    setIsReformulating(true);
    setSuggestions([]);
    try {
      const relatedItems = (facts || [])
        .filter(f => currentInsightRelatedFacts.includes(f.fact_id))
        .map(f => ({ text: f.text, type: 'fact' }));

      const response = await fetch(`${API_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentInsightText,
          entity_type: 'insight',
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
          <p style={{ margin: '0 0 1em' }}>Are you sure you want to delete this insight?</p>
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
          <h2>{mode === 'add' ? 'Add Insight' : 'Edit Insight'}</h2>
          <form>
            <label htmlFor="insight-text">Text</label>
            <textarea
              id="insight-text"
              rows={5}
              value={currentInsightText}
              required
              onChange={(event) => {
                setCurrentInsightText(event.target.value);
              }} />
            {backendAvailable && (
              <div className="reformulate-button-wrapper">
                <button
                  type="button"
                  className="modal-action-reformulate"
                  disabled={!currentInsightText.trim() || isReformulating}
                  onClick={handleReformulate}
                  title={!currentInsightText.trim() ? 'Enter text first' : 'Suggest alternative wordings'}
                >
                  <FontAwesomeIcon icon={isReformulating ? faSpinner : faWandMagicSparkles} spin={isReformulating} /> Reformulate
                </button>
              </div>
            )}
            <ReformulationSuggestions
              suggestions={suggestions}
              onSelect={(text) => { setCurrentInsightText(text); setSuggestions([]); }}
              onDismiss={() => setSuggestions([])}
            />
            <label htmlFor="insight-weight">Weight ({currentWeight ?? '—'}/10)</label>
            <input
              id="insight-weight"
              type="range"
              min={0}
              max={10}
              value={currentWeight ?? 5}
              onChange={(e) => setCurrentWeight(Number(e.target.value))}
            />
            <label htmlFor="insight-related-facts">Related Facts</label>
            <select
              id="insight-related-facts"
              value={currentInsightRelatedFacts}
              onChange={(event) => {
                const selectedOptions = Array.from(event.target.selectedOptions, (option) => option.value);
                setCurrentRelatedFacts(selectedOptions);
              }} multiple>
              {facts ? facts.map((fact) => (<option key={fact.fact_id} value={fact.fact_id}>{fact.text}</option>)) : ""}
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

export default InsightModal;
