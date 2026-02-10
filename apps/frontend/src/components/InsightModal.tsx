import React, { useEffect, useState } from 'react';
import ModalDialog from 'react-basic-modal-dialog';

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

  useEffect(() => {
    if (insightData) {
      setCurrentInsightText(insightData.text || '');
      setCurrentRelatedFacts(insightData.related_facts || []);
    } else {
      setCurrentInsightText('');
      setCurrentRelatedFacts([]);
    }
  }, [mode, insightData]);

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
    if (insightData && insightData.insight_id && window.confirm('Are you sure you want to delete this insight?')) {
      deleteInsight(insightData.insight_id);
      closeDialog();
    }
  };

  return (
    <ModalDialog isDialogVisible={isDialogVisible} closeDialog={closeDialog}>
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

export default InsightModal;
