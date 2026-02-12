import React from 'react';

const Input = ({ label, id, error, ...props }) => {
  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">{label}</label>
      <input 
        id={id}
        className={`form-input ${error ? 'form-input--error' : ''}`}
        {...props}
      />
      {error && <span className="form-error-msg">{error}</span>}
    </div>
  );
};

export default Input;