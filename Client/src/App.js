import React, { useContext, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalProvider, GlobalContext } from './context/GlobalState';
import ErrorBoundary from './components/ErrorBoundary';

// Layout & UI
import MainLayout from './components/MainLayout';
import Notification from './components/Notification';
import Login from './components/Login';
import Register from './components/Register';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Analytics = lazy(() => import('./pages/Analytics'));
const History = lazy(() => import('./pages/History'));
const Settings = lazy(() => import('./pages/Settings'));
const Budget = lazy(() => import('./pages/Budget'));

// Loading fallback component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div className="loader">Loading...</div>
  </div>
);

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
          <Route path="/" element={<PrivateRoute><MainLayout><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></MainLayout></PrivateRoute>} />
          <Route path="/transactions" element={<PrivateRoute><MainLayout><Suspense fallback={<PageLoader />}><Transactions /></Suspense></MainLayout></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><MainLayout><Suspense fallback={<PageLoader />}><Analytics /></Suspense></MainLayout></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><MainLayout><Suspense fallback={<PageLoader />}><History /></Suspense></MainLayout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><MainLayout><Suspense fallback={<PageLoader />}><Settings /></Suspense></MainLayout></PrivateRoute>} />
          <Route path="/budget" element={<PrivateRoute><MainLayout><Suspense fallback={<PageLoader />}><Budget /></Suspense></MainLayout></PrivateRoute>} />
          
          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      </GlobalProvider>
    </ErrorBoundary>
  );
}

export default App;