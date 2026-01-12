import React, { useEffect } from 'react'; // Added useEffect
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  // --- GLOBAL THEME CHECK ---
  useEffect(() => {
    // Check local storage for theme preference
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []); // Runs once when app starts

  // Helper to protect routes
  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <Routes>
        {/* Main Dashboard (Protected) */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

        {/* Profile Page (Protected) */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Auth Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
}

export default App;