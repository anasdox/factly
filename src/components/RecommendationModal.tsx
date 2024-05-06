import React, { useEffect, useState } from 'react';
import ModalDialog from 'react-basic-modal-dialog';

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

  useEffect(() => {
    if (mode === 'edit' && recommendationData) {
      setCurrentRecommendationText(recommendationData.text);
      setCurrentRelatedInsights(recommendationData.related_insights);
    } else {
      setCurrentRecommendationText('');
      setCurrentRelatedInsights([]);
    }
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
    if (recommendationData && recommendationData.recommendation_id ) {
      deleteRecommendation(recommendationData.recommendation_id);
      closeDialog();
    }
  };

  return (
    <ModalDialog isDialogVisible={isDialogVisible} closeDialog={closeDialog}>
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
      <button onClick={closeDialog}>Close</button>
      <button onClick={handleSave}>{mode === 'add' ? 'Add' : 'Save'}</button>
      {mode === 'edit' &&
        <button onClick={handleDelete}>Delete</button>
      }
    </ModalDialog>
  );
};

export default RecommendationModal;
