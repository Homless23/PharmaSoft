import React, { useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Notification = () => {
  const { alert } = useContext(GlobalContext);

  if (!alert) return null;

  const getIcon = (type) => {
    switch(type) {
      case 'success': return '✅';
      case 'danger': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`toast-container ${alert.type}`}>
      <div className="toast-body">
        <span className="toast-icon">{getIcon(alert.type)}</span>
        <div className="toast-text">
          <p className="toast-message">{alert.msg}</p>
        </div>
      </div>
      <div className="toast-progress-bar"></div>
    </div>
  );
};

export default Notification;