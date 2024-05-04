import React from 'react';
import './OutputItem.css';

type Props = {
  output: OutputType;
};

const OutputItem: React.FC<Props> = ({ output }) => {
  return (
    <div
      className="output-item item"
    >
      {output.text}
    </div>
  );
};

export default OutputItem;
