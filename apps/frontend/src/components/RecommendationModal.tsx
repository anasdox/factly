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
  saveRecommendation: (recommendationData: RecommendationType) => void;
  deleteRecommendation: (recommendationId: string) => void;
  recommendationData: RecommendationType | null;
  insights: InsightType[] | null;
  backendAvailable?: boolean;
  goal?: string;
};

const RecommendationModal: React.FC<Props> = ({
  mode,
  isDialogVisible,
  closeDialog,
  saveRecommendation,
  deleteRecommendation,
  recommendationData,
  insights,
  backendAvailable,
  goal,
}) => {
  const [currentRecommendationText, setCurrentRecommendationText] = useState("");
  const [currentRecommendationRelatedInsights, setCurrentRelatedInsights] = useState<string[]>([]);
  const [currentWeight, setCurrentWeight] = useState<number | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggestions, setSuggestions] = useState<ReformulationSuggestion[]>([]);
  const [isReformulating, setIsReformulating] = useState(false);

  useEffect(() => {
    if (recommendationData) {
      setCurrentRecommendationText(recommendationData.text || '');
      setCurrentRelatedInsights(recommendationData.related_insights || []);
      setCurrentWeight(recommendationData.weight);
    } else {
      setCurrentRecommendationText('');
      setCurrentRelatedInsights([]);
      setCurrentWeight(undefined);
    }
    setConfirmDelete(false);
    setSuggestions([]);
  }, [mode, recommendationData, isDialogVisible]);

  const handleSave = () => {
    const newRecommendationData: RecommendationType = {
      recommendation_id: recommendationData ? recommendationData.recommendation_id : Math.random().toString(16).slice(2),
      text: currentRecommendationText,
      related_insights: currentRecommendationRelatedInsights,
      weight: currentWeight,
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

  const handleReformulate = async () => {
    setIsReformulating(true);
    setSuggestions([]);
    try {
      const relatedItems = (insights || [])
        .filter(ins => currentRecommendationRelatedInsights.includes(ins.insight_id))
        .map(ins => ({ text: ins.text, type: 'insight' }));

      const response = await fetch(`${API_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentRecommendationText,
          entity_type: 'recommendation',
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
            {backendAvailable && (
              <div className="reformulate-button-wrapper">
                <button
                  type="button"
                  className="modal-action-reformulate"
                  disabled={!currentRecommendationText.trim() || isReformulating}
                  onClick={handleReformulate}
                  title={!currentRecommendationText.trim() ? 'Enter text first' : 'Suggest alternative wordings'}
                >
                  <FontAwesomeIcon icon={isReformulating ? faSpinner : faWandMagicSparkles} spin={isReformulating} /> Reformulate
                </button>
              </div>
            )}
            <ReformulationSuggestions
              suggestions={suggestions}
              onSelect={(text) => { setCurrentRecommendationText(text); setSuggestions([]); }}
              onDismiss={() => setSuggestions([])}
            />
            <label htmlFor="recommendation-weight">Weight ({currentWeight ?? '—'}/10)</label>
            <input
              id="recommendation-weight"
              type="range"
              min={0}
              max={10}
              value={currentWeight ?? 5}
              onChange={(e) => setCurrentWeight(Number(e.target.value))}
            />
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
