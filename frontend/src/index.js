import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GlobalProvider } from './context/GlobalState';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom'; // Router wrapper for the app

// Axios global defaults used by non-hook code (most code uses the api instance in GlobalState)
// Keep these defaults so any direct axios calls still target the backend and send cookies.
axios.defaults.baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";
axios.defaults.withCredentials = true;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GlobalProvider>
      {/* WRAP APP IN BROWSER ROUTER */}
      <BrowserRouter> 
        <App />
      </BrowserRouter>
    </GlobalProvider>
  </React.StrictMode>
);