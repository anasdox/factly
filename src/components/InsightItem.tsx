import React from 'react';
import './InsightItem.css';

type Props = {
  insight: InsightType;
};

const InsightItem: React.FC<Props> = ({ insight }) => {
  return (
    <div
      className="insight-item item"
    >
      {insight.text}
    </div>
  );
};

export default InsightItem;
