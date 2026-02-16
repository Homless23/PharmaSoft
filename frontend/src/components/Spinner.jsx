import React from 'react';

const Spinner = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      background: 'linear-gradient(145deg, #040b1f 0%, #040816 48%, #120b2b 100%)'
    }}>
      <div className="neon-spinner" style={{
        width: '50px',
        height: '50px',
        border: '4px solid rgba(255,255,255,0.1)',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Spinner;
