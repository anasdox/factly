import React from 'react';

type Props = {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
};

const Modal: React.FC<Props> = ({ isVisible, onClose, children, maxWidth = '600px' }) => {
  if (!isVisible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
