import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import './styles/errors.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance measurements removed (reportWebVitals was cleaned up)
