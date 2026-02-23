import React from 'react';
import { Alert, Button, Space } from 'antd';
import { useGlobalContext } from '../context/globalContext';

const Toast = () => {
  const { toast, hideToast } = useGlobalContext();

  if (!toast) return null;

  const onAction = () => {
    if (typeof toast.onAction === 'function') toast.onAction();
    hideToast();
  };

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, width: 420, maxWidth: 'calc(100vw - 24px)' }}>
      <Alert
        message={toast.message}
        type={toast.type || 'success'}
        showIcon
        action={(
          <Space>
            {toast.actionLabel ? (
              <Button size="small" onClick={onAction}>
                {toast.actionLabel}
              </Button>
            ) : null}
            <Button size="small" onClick={hideToast}>Dismiss</Button>
          </Space>
        )}
      />
    </div>
  );
};

export default Toast;
