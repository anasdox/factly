import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faEdit, faLink } from '@fortawesome/free-solid-svg-icons';


type Props = {
  children: React.ReactElement;
  setItemRef: (element: HTMLDivElement) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  item: InputType | FactType | InsightType | RecommendationType | OutputType;
  index: number;
};

const ItemWrapper: React.FC<Props> = ({ children, setItemRef, handleMouseEnter, handleMouseLeave, item, index }) => {

  return (
    <div className='wrapper' ref={el => el ? setItemRef(el) : null}>
      {React.cloneElement(children, {setItemRef, handleMouseEnter, handleMouseLeave, item, index })}
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

export default ItemWrapper;
