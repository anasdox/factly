import React, { useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faImage, faVideo, faFileAudio, faFilePdf, faGlobe, faFileCsv, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import './InputItem.css';
type Props = {
    input: InputType;
    setInputRef: (element: HTMLDivElement, index: number) => void
    index: number;
    handleMouseEnter: () => void;
    handleMouseLeave: () => void;
};

const InputItem: React.FC<Props> = ({ input, setInputRef, index, handleMouseEnter, handleMouseLeave}) => {
    
    
    return (
        <div
            id={"input-" + input.input_id}
            ref={el => el ? setInputRef(el, index) : null}
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
    );
};

export default InputItem;
