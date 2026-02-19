import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlus, faTrashCan, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

type Props = {
  mode: 'add' | 'edit';
  isDialogVisible: boolean;
  closeDialog: () => void;
  saveInsight: (insightData: InsightType) => void;
  deleteInsight: (insightId: string) => void;
  insightData: InsightType | null;
  facts: FactType[] | null;
};

const InsightModal: React.FC<Props> = ({
  mode,
  isDialogVisible,
  closeDialog,
  saveInsight,
  deleteInsight,
  insightData,
  facts
}) => {
  const [currentInsightText, setCurrentInsightText] = useState("");
  const [currentInsightRelatedFacts, setCurrentRelatedFacts] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (insightData) {
      setCurrentInsightText(insightData.text || '');
      setCurrentRelatedFacts(insightData.related_facts || []);
    } else {
      setCurrentInsightText('');
      setCurrentRelatedFacts([]);
    }
    setConfirmDelete(false);
  }, [mode, insightData, isDialogVisible]);

  const handleSave = () => {
    const newInsightData: InsightType = {
      insight_id: insightData ? insightData.insight_id : Math.random().toString(16).slice(2),
      text: currentInsightText,
      related_facts: currentInsightRelatedFacts,
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
