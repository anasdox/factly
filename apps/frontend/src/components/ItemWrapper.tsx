import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faDiagramProject, faCheck, faRobot } from '@fortawesome/free-solid-svg-icons';
import { isActionableStatus } from '../lib';


type Props = {
  children: React.ReactElement;
  id: string;
  setItemRef: (element: HTMLDivElement, index: number) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  item: ItemType;
  index: number;
  openEditModal: OpenEditModalFunction | null;
  onViewTraceability?: () => void;
  onClearStatus?: () => void;
  onProposeUpdate?: () => void;
  backendAvailable?: boolean;
};

function formatStatus(status: EntityStatus, separator: string): string {
  return status.replace(/_/g, separator);
}

const ItemWrapper: React.FC<Props> = ({
  children,
  id,
  setItemRef,
  handleMouseEnter,
  handleMouseLeave,
  item,
  index,
  openEditModal,
  onViewTraceability,
  onClearStatus,
  onProposeUpdate,
  backendAvailable}) => {

  const status = item.status;
  const version = item.version;
  const actionable = isActionableStatus(status);

  return (
    <div
      id={id}
      className={`wrapper ${actionable && status ? 'status-' + formatStatus(status, '-') : ''}`}
      ref={el => el ? setItemRef(el, index) : null}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {actionable && status && (
        <span className={`status-chip ${formatStatus(status, '-')}`}>{formatStatus(status, ' ')}</span>
      )}
      {version && version > 1 && (
        <span className="version-badge">v{version}</span>
      )}
      {React.cloneElement(children, { item })}
      <div id={`${id}-toolbar`} className='wrapper-item-toolbar' onClick={(e) => e.stopPropagation()}>
        {onViewTraceability && (
          <div onClick={(e) => { e.stopPropagation(); onViewTraceability(); }} title="View traceability">
            <FontAwesomeIcon size={'sm'} icon={faDiagramProject} />
          </div>
        )}
        {actionable && onClearStatus && (
          <div onClick={(e) => { e.stopPropagation(); onClearStatus(); }} title="Confirm valid">
            <FontAwesomeIcon size={'sm'} icon={faCheck} />
          </div>
        )}
        {actionable && onProposeUpdate && (
          <div
            onClick={(e) => { e.stopPropagation(); if (backendAvailable) onProposeUpdate(); }}
            title={backendAvailable ? 'Propose AI update' : 'Backend unavailable'}
            style={backendAvailable ? undefined : { opacity: 0.3, cursor: 'not-allowed' }}
          >
            <FontAwesomeIcon size={'sm'} icon={faRobot} />
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
