import React, { useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Notification = () => {
  const { alert, clearAlert } = useContext(GlobalContext);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => clearAlert(), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert, clearAlert]);

  if (!alert) return null;

  const styles = {
    toast: {
      position: 'fixed',
      top: '24px',
      right: '24px',
      padding: '16px 24px',
      borderRadius: '12px',
      background: alert.type === 'success' ? '#10b981' : '#ef4444',
      color: 'white',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontWeight: 600,
      animation: 'slideIn 0.3s ease-out'
    }
  };

  return (
    <div style={styles.toast}>
      <span>{alert.type === 'success' ? '✅' : '❌'}</span>
      {alert.msg}
    </div>
  );
};

export default Notification;