import React, { useCallback, useState } from 'react';
import RecommendationItem from './RecommendationItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import RecommendationModal from './RecommendationModal';

type Props = {
  recommendationRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;
};

const RecommendationList: React.FC<Props> = ({ recommendationRefs, data, setData, handleMouseEnter, handleMouseLeave }) => {

  const [isRecommendationDialogVisible, setIsRecommendationDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingRecommendation, setEditingRecommendation] = useState<ItemType | null>(null);
  const setRecommendationRef = useCallback((element: HTMLDivElement, index: number) => { recommendationRefs.current[index] = element; }, [recommendationRefs]);

  const openAddModal = () => {
    setModalMode('add');
    setEditingRecommendation(null);
    setIsRecommendationDialogVisible(true);
  };

  const openEditModal = (recommendation: ItemType) => {
    setModalMode('edit');
    setEditingRecommendation(recommendation);
    setIsRecommendationDialogVisible(true);
  };

  const saveRecommendation = (recommendationData: RecommendationType) => {
    if (modalMode === 'add') {
      const newRecommendation: RecommendationType = {
        recommendation_id: Math.random().toString(16).slice(2),
        text: recommendationData.text,
        related_insights: recommendationData.related_insights,
      };
      setData((prevState) => prevState ? ({
        ...prevState,
        recommendations: [...prevState.recommendations, newRecommendation]
      }) : prevState);
    } else if (modalMode === 'edit' && recommendationData.recommendation_id) {
      const updatedRecommendations = data.recommendations.map((recommendation) =>
        recommendation.recommendation_id === recommendationData.recommendation_id ? { ...recommendation, ...recommendationData } : recommendation
      );
      setData((prevState) => prevState ? ({
        ...prevState,
        recommendations: updatedRecommendations
      }) : prevState);
    }
    setIsRecommendationDialogVisible(false);
  };

  return (
    <div className="column recommendations">
      <h2>📝Recommendations</h2>
      {data.recommendations.map((recommendation, index) => (

        <ItemWrapper
          id={"recommendation-" + recommendation.recommendation_id}
          key={recommendation.recommendation_id}
          index={index}
          item={recommendation}
          setItemRef={setRecommendationRef}
          handleMouseEnter={() => handleMouseEnter("recommendation", recommendation.recommendation_id, data)}
          handleMouseLeave={() => handleMouseLeave("recommendation", recommendation.recommendation_id, data)}
          openEditModal={openEditModal}
        >
          <RecommendationItem
            recommendation={recommendation}
          />
        </ItemWrapper>

      ))}
      <button className="add-button recommendation-add-button" onClick={openAddModal}><FontAwesomeIcon icon={faAdd} /></button>
      <RecommendationModal
        mode={modalMode}
        isDialogVisible={isRecommendationDialogVisible}
        closeDialog={() => setIsRecommendationDialogVisible(false)}
        saveRecommendation={saveRecommendation}
        recommendationData={editingRecommendation as RecommendationType}
        insights={data.insights}
      />
    </div>
  );
};

export default RecommendationList;
