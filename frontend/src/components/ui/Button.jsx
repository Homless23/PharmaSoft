import React from 'react';
import { Button as AntButton } from 'antd';

const Button = ({ variant = 'primary', className = '', loading = false, disabled = false, children, ...props }) => {
  const type = variant === 'primary' ? 'primary' : 'default';
  const danger = variant === 'danger';
  return (
    <AntButton
      {...props}
      type={type}
      danger={danger}
      className={className}
      loading={loading}
      disabled={disabled}
    >
      {children}
    </AntButton>
  );
};

export default Button;
