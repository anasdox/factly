import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit } from '@fortawesome/free-solid-svg-icons';


type Props = {
  children: React.ReactElement;
  id: string;
  setItemRef: (element: HTMLDivElement, index: number) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  item: InputType | FactType | InsightType | RecommendationType | OutputType;
  index: number;
};

const ItemWrapper: React.FC<Props> = ({ children, id, setItemRef, handleMouseEnter, handleMouseLeave, item, index }) => {

  return (
    <div
      id={id}
      className='wrapper'
      ref={el => el ? setItemRef(el, index) : null}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {React.cloneElement(children, { item })}
      <div id={`${id}-toolbar`} className='wrapper-item-toolbar'>
        {/*<div>
          <FontAwesomeIcon size={'sm'} icon={faLink} />
        </div>
        <div>
          <FontAwesomeIcon size={'sm'} icon={faAdd} />
        </div>*/}
        <div>
          <FontAwesomeIcon size={'sm'} icon={faEdit} />
        </div>
      </div>
    </div>
  );
};

export default ItemWrapper;
