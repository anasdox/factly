import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlus, faTrashCan, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

type Props = {
  mode: 'add' | 'edit';
  isDialogVisible: boolean;
  closeDialog: () => void;
  saveRecommendation: (recommendationData: RecommendationType) => void;
  deleteRecommendation: (recommendationId: string) => void;
  recommendationData: RecommendationType | null;
  insights: InsightType[] | null;
};

const RecommendationModal: React.FC<Props> = ({
  mode,
  isDialogVisible,
  closeDialog,
  saveRecommendation,
  deleteRecommendation,
  recommendationData,
  insights
}) => {
  const [currentRecommendationText, setCurrentRecommendationText] = useState("");
  const [currentRecommendationRelatedInsights, setCurrentRelatedInsights] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (recommendationData) {
      setCurrentRecommendationText(recommendationData.text || '');
      setCurrentRelatedInsights(recommendationData.related_insights || []);
    } else {
      setCurrentRecommendationText('');
      setCurrentRelatedInsights([]);
    }
    setConfirmDelete(false);
  }, [mode, recommendationData]);

  const handleSave = () => {
    const newRecommendationData: RecommendationType = {
      recommendation_id: recommendationData ? recommendationData.recommendation_id : Math.random().toString(16).slice(2),
      text: currentRecommendationText,
      related_insights: currentRecommendationRelatedInsights,
    };
    saveRecommendation(newRecommendationData);
    closeDialog();
  };

  const handleDelete = () => {
    if (recommendationData && recommendationData.recommendation_id) {
      deleteRecommendation(recommendationData.recommendation_id);
      closeDialog();
    }
  };

  return (
    <Modal isVisible={isDialogVisible} onClose={closeDialog}>
      {confirmDelete ? (
        <>
          <p style={{ margin: '0 0 1em' }}>Are you sure you want to delete this recommendation?</p>
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
          <h2>{mode === 'add' ? 'Add Recommendation' : 'Edit Recommendation'}</h2>
          <form>
            <label htmlFor="recommendation-text">Text</label>
            <textarea
              id="recommendation-text"
              rows={5}
              value={currentRecommendationText}
              required
              onChange={(event) => {
                setCurrentRecommendationText(event.target.value);
              }} />
            <label htmlFor="recommendation-related-insights">Related Insights</label>
            <select
              id="recommendation-related-insights"
              value={currentRecommendationRelatedInsights}
              onChange={(event) => {
                const selectedOptions = Array.from(event.target.selectedOptions, (option) => option.value);
                setCurrentRelatedInsights(selectedOptions);
              }} multiple>
              {insights ? insights.map((insight) => (<option key={insight.insight_id} value={insight.insight_id}>{insight.text}</option>)) : ""}
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

export default RecommendationModal;
