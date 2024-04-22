import React from 'react';
import './InsightItem.css';

type Props = {
  insight: InsightType;
  setInsightRef: (element: HTMLDivElement, index: number) => void
  index: number;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
};

const InsightItem: React.FC<Props> = ({ insight, setInsightRef, index, handleMouseEnter, handleMouseLeave }) => {
  return (
    <div
      id={"insight-" + insight.insight_id}
      ref={el => el ? setInsightRef(el, index) : null}
      key={insight.insight_id}
      className="insight-item item"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {insight.text}
    </div>
  );
};

export default InsightItem;
