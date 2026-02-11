import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faGlobe, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import './InputItem.css';
type Props = {
  input: InputType;
};

const InputItem: React.FC<Props> = ({ input }) => {
  return (
    <div
      className="input-item item"
      onClick={() => window.open(input.url, '_blank', 'noopener')}
    >
      <div>
        <FontAwesomeIcon className="input-icon" size={'2xl'} icon={
          input.type === "text" ? faFileAlt :
            input.type === "web" ? faGlobe :
              faQuestionCircle
        } />
      </div>
      <div>{input.title}</div>
    </div>
  );
};

export default InputItem;
