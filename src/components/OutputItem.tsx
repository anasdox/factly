import React from 'react';
import './OutputItem.css';

type Props = {
  output: OutputType;
  setOutputRef: (element: HTMLDivElement, index: number) => void
  index: number;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
};

const OutputItem: React.FC<Props> = ({ output, setOutputRef, index, handleMouseEnter, handleMouseLeave }) => {
  return (
    <div
      id={"output-" + output.output_id}
      ref={el => el ? setOutputRef(el, index) : null}
      key={output.output_id}
      className="output-item item"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {output.text}
    </div>
  );
};

export default OutputItem;
