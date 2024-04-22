import React, { useCallback, useState } from 'react';
import RecommendationItem from './RecommendationItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ModalDialog from 'react-basic-modal-dialog';


type Props = {
  recommendationRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;

};

const RecommendationList: React.FC<Props> = ({ recommendationRefs, data, setData, handleMouseEnter, handleMouseLeave }) => {

  const [isRecommendationDialogVisible, setIsRecommendationDialogVisible] = useState(false);
  const [currentRecommendationText, setCurrentRecommendationText] = useState("");
  const [currentRecommendationRelatedInsights, setCurrentRecommendationRelatedInsights] = useState<string[]>([]);
  const setRecommendationRef = useCallback((element: HTMLDivElement, index: number) => { recommendationRefs.current[index] = element; }, [recommendationRefs]);


  return (
    <div className="column recommendations">
      <h2>👍Recommendations</h2>
      {data.recommendations.map((recommendation, index) => (
        <RecommendationItem
          key={recommendation.recommendation_id}
          recommendation={recommendation}
          index={index}
          setRecommendationRef={setRecommendationRef}
          handleMouseEnter={() => handleMouseEnter("recommendation", recommendation.recommendation_id, data)}
          handleMouseLeave={() => handleMouseLeave("recommendation", recommendation.recommendation_id, data)}
        />
      ))}
      <button className="add-button recommendation-add-button" onClick={() => { setIsRecommendationDialogVisible(true) }}><FontAwesomeIcon icon={faAdd} /></button>
      <ModalDialog isDialogVisible={isRecommendationDialogVisible} onClose={() => setIsRecommendationDialogVisible(false)}>
        <h2>Add Recommendation</h2>
        <form onSubmit={(e) => { e.preventDefault(); }}>
          <label htmlFor="recommendation-input">Text</label>
          <textarea
            id="recommendation-input"
            rows={5}
            onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => {
              setCurrentRecommendationText(event.target.value);
            }} />
          <label htmlFor="recommendation-related-insights">Related Insights</label>
          <select
            id="recommendation-related-insights"
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              const selectedOptions = Array.from(event.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
              setCurrentRecommendationRelatedInsights(selectedOptions);
            }} multiple>
            {data.insights.map(insight => (<option key={insight.insight_id} value={insight.insight_id}>{insight.text}</option>))}
          </select>
        </form>
        <button onClick={() => setIsRecommendationDialogVisible(false)}>Close</button>
        <button onClick={() => {
          const newRecommendation: RecommendationType = {
            recommendation_id: data.recommendations[data.recommendations.length - 1].recommendation_id + 1,
            text: currentRecommendationText,
            related_insights: currentRecommendationRelatedInsights
          };
          setData((prevState) => prevState ? ({ ...prevState, recommendations: [...prevState.recommendations, newRecommendation] }) : prevState);
          setIsRecommendationDialogVisible(false);
        }}>Save</button>
      </ModalDialog>
    </div>
  );
};


export default RecommendationList;
