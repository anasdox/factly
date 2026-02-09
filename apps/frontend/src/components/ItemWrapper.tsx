import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faWandMagicSparkles, faSpinner } from '@fortawesome/free-solid-svg-icons';


type Props = {
  children: React.ReactElement;
  id: string;
  setItemRef: (element: HTMLDivElement, index: number) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  item: ItemType;
  index: number;
  openEditModal: OpenEditModalFunction | null;
  onExtractFacts?: () => void;
  extractDisabled?: boolean;
  extractLoading?: boolean;
};

const ItemWrapper: React.FC<Props> = ({
  children,
  id,
  setItemRef,
  handleMouseEnter,
  handleMouseLeave,
  item,
  index,
  openEditModal,
  onExtractFacts,
  extractDisabled,
  extractLoading}) => {

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
        {onExtractFacts !== undefined && (
          <div
            onClick={() => !extractDisabled && !extractLoading && onExtractFacts ? onExtractFacts() : null}
            style={{ opacity: extractDisabled ? 0.3 : 1, cursor: extractDisabled ? 'not-allowed' : 'pointer' }}
            title="Extract Facts"
          >
            <FontAwesomeIcon size={'sm'} icon={extractLoading ? faSpinner : faWandMagicSparkles} spin={extractLoading} />
          </div>
        )}
        <div onClick={() => openEditModal ? openEditModal(item): null} title="Edit">
          <FontAwesomeIcon size={'sm'} icon={faPencil} />
        </div>
      </div>
    </div>
  );
};

export default ItemWrapper;
