import React from 'react';
import './FactItem.css';

type Props = {
  fact: FactType;
  setFactRef: (element: HTMLDivElement, index: number) => void
  index: number;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
};

const FactItem: React.FC<Props> = ({ fact, setFactRef, index, handleMouseEnter, handleMouseLeave }) => {
  return (
    <div
      id={"fact-" + fact.fact_id}
      ref={el => el ? setFactRef(el, index) : null}
      key={fact.fact_id}
      className="fact-item item"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {fact.text}
    </div>
  );
};

export default FactItem;
