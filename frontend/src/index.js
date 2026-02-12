import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GlobalProvider } from './context/globalContext';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

// Configure axios global defaults for all API requests
axios.defaults.baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
axios.defaults.withCredentials = true;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <GlobalProvider>
        <App />
      </GlobalProvider>
    </BrowserRouter>
  </React.StrictMode>
);