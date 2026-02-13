import React from 'react';
import { createPortal } from 'react-dom';

type Props = {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
};

const Modal: React.FC<Props> = ({ isVisible, onClose, children, maxWidth = '600px' }) => {
  if (!isVisible) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
