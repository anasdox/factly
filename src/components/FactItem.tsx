import React from 'react';
import './FactItem.css';

type Props = {
  fact: FactType;
};

const FactItem: React.FC<Props> = ({ fact }) => {
  return (
    <div
      className="fact-item item"
    >
      {fact.text}
    </div>
  );
};

export default FactItem;
