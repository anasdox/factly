import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation, faCircleInfo, faSpinner } from '@fortawesome/free-solid-svg-icons';
import './Toast.css';

type Props = {
  message: string | null;
  type?: 'error' | 'info' | 'waiting';
  onClose: () => void;
};

const toastIconMap = {
  error: <FontAwesomeIcon icon={faCircleExclamation} />,
  info: <FontAwesomeIcon icon={faCircleInfo} />,
  waiting: <FontAwesomeIcon icon={faSpinner} spin />,
};

const Toast = ({ message, type = 'error', onClose }: Props) => {
  useEffect(() => {
    if (message && type !== 'waiting') {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, type, onClose]);

  if (!message) return null;

  return (
    <div className="toast-overlay">
      <div className="toast">
        <span className="toast-icon">{toastIconMap[type]}</span>
        <span>{message}</span>
      </div>
    </div>
  );
};

export default Toast;
