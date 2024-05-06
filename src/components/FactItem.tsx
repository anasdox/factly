import React from 'react';
import './FactItem.css';
import parse from 'html-react-parser';

type Props = {
  fact: FactType;
};

const FactItem: React.FC<Props> = ({ fact }) => {
  return (
    <div
      className="fact-item item"
    >
      {parse(fact.text.replace(/([0-9]+)/, "<b>$1</b>"))}
    </div>
  );
};

export default FactItem;
