import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalProvider, GlobalContext } from './context/GlobalState';

// --- CSS ---
import './index.css';

// --- LAYOUTS & AUTH ---
import MainLayout from './components/MainLayout';
import { Login } from './components/Login';
import { Register } from './components/Register';

// --- COMPONENTS ---
import DashboardStats from './components/DashboardStats';
import TransactionList from './components/TransactionList';
// Note: AddTransaction is NO LONGER imported here. It is handled by MainLayout.js

// --- PAGES ---
import Analytics from './pages/Analytics';
import History from './pages/History';
import Budget from './pages/Budget'; // Added from Phase 7
import Profile from './pages/Profile'; // Added from Phase 8

// --- PRIVATE ROUTE WRAPPER ---
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(GlobalContext);
  if (loading) return <div className="container" style={{padding: '50px'}}>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// --- DASHBOARD COMPONENT ---
// Re-designed to match your Fintech SaaS Screenshot
const Dashboard = () => {
  return (
    <div className="container">
      {/* 1. Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>Dashboard</h2>
      </div>

      {/* 2. Main Grid: Stats (Left) & Activity (Right) */}
      <div className="dashboard-grid-premium">
        
        {/* LEFT COL: Budget & Financial Health */}
        <div className="grid-item-main">
          <DashboardStats />
        </div>

        {/* RIGHT COL: Recent Activity Feed */}
        <div className="grid-item-side card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
            <h3 className="card-label" style={{margin: 0}}>RECENT ACTIVITY</h3>
            <span className="text-muted text-sm" style={{cursor: 'pointer'}}>View All</span>
          </div>
          {/* isDashboard={true} hides the full list header and limits items */}
          <TransactionList isDashboard={true} />
        </div>

      </div>

      {/* 3. Bottom Row: Quick Action Cards */}
      <h3 className="card-label" style={{ marginBottom: '15px' }}>QUICK ACTIONS</h3>
      <div className="quick-actions-row">
        
        {/* Analytics Shortcut */}
        <div className="card action-card">
          <span style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</span>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>View Analytics</h3>
          <p className="text-muted text-sm" style={{ marginTop: '5px' }}>Deep dive into spending trends</p>
        </div>

        {/* Goals Shortcut (Placeholder) */}
        <div className="card action-card disabled">
          <span style={{ fontSize: '2rem', marginBottom: '10px' }}>🎯</span>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Financial Goals</h3>
          <p className="text-muted text-sm" style={{ marginTop: '5px' }}>Coming Soon</p>
        </div>

      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
function App() {
  return (
    <GlobalProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* --- PUBLIC ROUTES --- */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* --- PRIVATE ROUTES (Wrapped in Shell) --- */}
            
            {/* 1. Dashboard */}
            <Route 
              path="/" 
              element={
                <PrivateRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </PrivateRoute>
              } 
            />

            {/* 2. Full History Ledger */}
            <Route 
              path="/history" 
              element={
                <PrivateRoute>
                  <MainLayout>
                    <History />
                  </MainLayout>
                </PrivateRoute>
              } 
            />
            
            {/* 3. Analytics & Charts */}
            <Route 
              path="/analytics" 
              element={
                <PrivateRoute>
                  <MainLayout>
                    <Analytics />
                  </MainLayout>
                </PrivateRoute>
              } 
            />

            {/* 4. Budget Planning */}
            <Route 
              path="/budget" 
              element={
                <PrivateRoute>
                  <MainLayout>
                    <Budget />
                  </MainLayout>
                </PrivateRoute>
              } 
            />

            {/* 5. User Profile & Settings */}
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <MainLayout>
                    <Profile />
                  </MainLayout>
                </PrivateRoute>
              } 
            />

          </Routes>
        </div>
      </Router>
    </GlobalProvider>
  );
}

export default App;