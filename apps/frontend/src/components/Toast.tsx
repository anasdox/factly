import { useEffect } from 'react';
import './Toast.css';

type Props = {
  message: string | null;
  onClose: () => void;
};

const Toast = ({ message, onClose }: Props) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="toast-overlay">
      <div className="toast-error">{message}</div>
    </div>
  );
};

export default Toast;
