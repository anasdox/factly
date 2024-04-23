import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faEdit, faLink } from '@fortawesome/free-solid-svg-icons';


type Props<T> = T & {
  setItemRef: (element: HTMLDivElement, index: number) => void
};

type ChildProps = {
  children: (props: Props<any>) => JSX.Element;
  setItemRef: (element: HTMLDivElement, index: number) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  item: InputType | FactType | InsightType | RecommendationType | OutputType;
  index: number;
};

const ItemWrapper: React.FC<ChildProps> = ({ children, setItemRef, handleMouseEnter, handleMouseLeave, item, index }) => {

  return (
    <div className='wrapper' ref={el => el ? setItemRef(el) : null}>
      {children({ ...item, index, handleMouseEnter, handleMouseLeave })}
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
