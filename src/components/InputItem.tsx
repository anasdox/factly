import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faImage, faVideo, faFileAudio, faFilePdf, faGlobe, faFileCsv, faQuestionCircle, faLink, faAdd, faEdit } from '@fortawesome/free-solid-svg-icons';
import './InputItem.css';
type Props = {
  input: InputType;
  setInputRef: (element: HTMLDivElement, index: number) => void
  index: number;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
};

const InputItem: React.FC<Props> = ({ input, setInputRef, index, handleMouseEnter, handleMouseLeave }) => {


  return (
    <div className='wrapper' ref={el => el ? setInputRef(el, index) : null}>
      <div
        id={"input-" + input.input_id}
        key={input.input_id}
        className="input-item item"
        onClick={() => window.open(input.url, '_blank', 'noopener')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div>
          <FontAwesomeIcon color="#555" size={'2xl'} icon={
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
      <div className='wrapper-item-toolbar'>
        <div>
          <FontAwesomeIcon size={'sm'} icon={faLink} />
        </div>
        <div>
          <FontAwesomeIcon size={'sm'} icon={faAdd} />
        </div>
        <div>
          <FontAwesomeIcon size={'sm'} icon={faEdit} />
        </div>
      </div>
    </div>
  );
};

export default InputItem;
