import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalProvider, GlobalContext } from './context/GlobalState';
import ErrorBoundary from './components/ErrorBoundary';

// Layout & UI
import MainLayout from './components/MainLayout';
import Notification from './components/Notification';
import Login from './components/Login';
import Register from './components/Register';

// Pages
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import History from './pages/History';
import Settings from './pages/Settings';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(GlobalContext);

  // If we are still fetching the user, show a loader
  if (loading) return (
    <div className="auth-wrapper">
      <div className="loader">Synchronizing Session...</div>
    </div>
  );

  // If not authenticated, send to login
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ErrorBoundary>
      <GlobalProvider>
        <Notification />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Secure Protected Routes */}
          <Route path="/" element={<PrivateRoute><MainLayout><Dashboard /></MainLayout></PrivateRoute>} />
          <Route path="/transactions" element={<PrivateRoute><MainLayout><Transactions /></MainLayout></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><MainLayout><Analytics /></MainLayout></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><MainLayout><History /></MainLayout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><MainLayout><Settings /></MainLayout></PrivateRoute>} />
          
          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      </GlobalProvider>
    </ErrorBoundary>
  );
}

export default App;