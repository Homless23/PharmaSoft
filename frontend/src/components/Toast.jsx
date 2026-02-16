import React from 'react';
import { useGlobalContext } from '../context/globalContext';

const Toast = () => {
  const { toast, hideToast } = useGlobalContext();

  if (!toast) return null;

  const onAction = () => {
    if (typeof toast.onAction === 'function') toast.onAction();
    hideToast();
  };

  return (
    <div className={`toast-wrap ${toast.type || 'success'}`}>
      <span className="toast-message">{toast.message}</span>
      <div className="toast-actions">
        {toast.actionLabel && (
          <button className="toast-btn action" onClick={onAction}>
            {toast.actionLabel}
          </button>
        )}
        <button className="toast-btn" onClick={hideToast}>Dismiss</button>
      </div>
    </div>
  );
};

export default Toast;
