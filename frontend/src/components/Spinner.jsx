import React from 'react';

const Spinner = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',        // Takes full screen height
      width: '100%',
      position: 'fixed',      // Stays in place even if you scroll
      top: 0,
      left: 0,
      zIndex: 9999,           // Ensures it sits on top of everything
      background: 'var(--bg-body)' // Matches your app background
    }}>
      {/* A Simple Neon CSS Spinner */}
      <div className="neon-spinner" style={{
        width: '50px',
        height: '50px',
        border: '4px solid rgba(255,255,255,0.1)',
        borderTop: '4px solid #6366f1', // Brand Color
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      
      {/* Injecting keyframes for the animation */}
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