import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faImage, faVideo, faFileAudio, faFilePdf, faGlobe, faFileCsv, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
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
            input.type === "image" ? faImage :
              input.type === "video" ? faVideo :
                input.type === "audio" ? faFileAudio :
                  input.type === "pdf" ? faFilePdf :
                    input.type === "web" ? faGlobe :
                      input.type === "csv" ? faFileCsv :
                        faQuestionCircle
        } />
      </div>
      <div>{input.title}</div>
    </div>
  );
};

export default InputItem;
