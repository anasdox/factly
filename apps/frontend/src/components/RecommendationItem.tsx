import React from 'react';
import './RecommendationItem.css';

type Props = {
  recommendation: RecommendationType;
};

const RecommendationItem: React.FC<Props> = ({ recommendation }) => {
  return (
    <div
      className="recommendation-item item"
    >
      {recommendation.text}
    </div>
  );
};

export default RecommendationItem;
