import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faDiagramProject, faCheck, faRobot, faSpinner, faTrashCan } from '@fortawesome/free-solid-svg-icons';
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
  proposingUpdate?: boolean;
  backendAvailable?: boolean;
  onDelete?: () => void;
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
  proposingUpdate,
  backendAvailable,
  onDelete}) => {

  const status = item.status;
  const version = item.version;
  const weight = 'weight' in item ? (item as any).weight as number | undefined : undefined;
  const actionable = isActionableStatus(status);
  const itemId = id.replace(/^[^-]+-/, '');

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/x-factly-item-id', itemId);
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const weightStyle = weight != null ? {
    borderLeftWidth: `${Math.max(2, weight * 0.4)}px`,
    borderLeftStyle: 'solid' as const,
    borderLeftColor: `color-mix(in srgb, var(--color-weight, #e8a735) ${Math.max(20, weight * 10)}%, transparent)`,
  } : undefined;

  return (
    <div
      id={id}
      data-chat-item-id={itemId}
      className={`wrapper ${actionable && status ? 'status-' + formatStatus(status, '-') : ''}`}
      ref={el => el ? setItemRef(el, index) : null}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      draggable
      onDragStart={handleDragStart}
      style={weightStyle}
    >
      <div className="item-content">
        {((version && version > 1) || (actionable && status) || weight != null) && (
          <div className="item-badges">
            <div className="item-badges-left">
              {version && version > 1 && <span className="version-badge">v{version}</span>}
              {weight != null && <span className="weight-badge">{weight}</span>}
            </div>
            <div className="item-badges-right">
              {actionable && status && (
                <span className={`status-chip ${formatStatus(status, '-')}`}>{formatStatus(status, ' ')}</span>
              )}
            </div>
          </div>
        )}
        {React.cloneElement(children, { item })}
      </div>
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
            onClick={(e) => { e.stopPropagation(); if (backendAvailable && !proposingUpdate) onProposeUpdate(); }}
            title={proposingUpdate ? 'Generating proposal...' : backendAvailable ? 'Propose AI update' : 'Backend unavailable'}
            style={!backendAvailable || proposingUpdate ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
          >
            <FontAwesomeIcon size={'sm'} icon={proposingUpdate ? faSpinner : faRobot} spin={proposingUpdate} />
          </div>
        )}
        <div onClick={() => openEditModal ? openEditModal(item): null} title="Edit">
          <FontAwesomeIcon size={'sm'} icon={faPencil} />
        </div>
        {onDelete && (
          <div onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
            <FontAwesomeIcon size={'sm'} icon={faTrashCan} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemWrapper;
