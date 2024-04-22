import React from 'react';
import './RecommendationItem.css';

type Props = {
  recommendation: RecommendationType;
  setRecommendationRef: (element: HTMLDivElement, index: number) => void
  index: number;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
};

const RecommendationItem: React.FC<Props> = ({ recommendation, setRecommendationRef, index, handleMouseEnter, handleMouseLeave }) => {
  return (
    <div
      id={"recommendation-" + recommendation.recommendation_id}
      ref={el => el ? setRecommendationRef(el, index) : null}
      key={recommendation.recommendation_id}
      className="recommendation-item item"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {recommendation.text}
    </div>
  );
};

export default RecommendationItem;
