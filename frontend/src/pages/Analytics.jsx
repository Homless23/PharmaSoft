import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalState';

// Components
import ExpenseChart from '../components/ExpenseChart';
import CategoryPieChart from '../components/CategoryPieChart'; // The new Neon Donut
import BudgetSection from '../components/BudgetSection';
import TransactionList from '../components/TransactionList';
import OnboardingWizard from '../components/OnboardingWizard';
import Spinner from '../components/Spinner';

const Analytics = () => {
  const navigate = useNavigate();
  const { getData, loading } = useGlobalContext();
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    else getData();
  }, [getData, navigate]);

  if (loading) return <Spinner />;

  return (
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar" style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ 
            textDecoration: 'none', fontWeight: '900', fontSize: '1.5rem', 
            color: 'var(--text-secondary)', letterSpacing: '-0.02em' 
        }}>
          ExpenseTracker
        </Link>
        
        <div className="nav-links" style={{ display: 'flex', gap: '2rem' }}>
            <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500' }}>Dashboard</Link>
            <Link to="/add" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500' }}>+ Add</Link>
            <Link to="/analytics" style={{ color: '#fff', textDecoration: 'none', fontWeight: '700' }}>Analytics</Link>
            <Link to="/profile" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500' }}>Profile</Link>
        </div>

        <div>
            <button 
                onClick={() => {localStorage.removeItem('token'); navigate('/login')}} 
                className="btn-primary" 
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', width: 'auto' }}
            >
                Log Out
            </button>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 4rem 2rem' }}>
        
        {/* Header + Auto-Set Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0, color: '#fff' }}>Analytics & Budgets</h1>
            
            <button 
                onClick={() => setShowWizard(true)}
                className="glass-card"
                style={{
                    padding: '0.8rem 1.2rem', 
                    fontSize: '0.9rem', 
                    cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px'
                }}
            >
                <span style={{ fontSize: '1.1rem' }}>✨</span> Auto-Set Budgets
            </button>
        </div>

        {/* --- CHARTS GRID --- */}
        <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '1.5rem', 
            marginBottom: '1.5rem' 
        }}>
            {/* 1. Trend Chart (Takes 2/3 width on desktop) */}
            <div style={{ flex: '2', minWidth: '350px' }}>
                <ExpenseChart />
            </div>

            {/* 2. Donut Chart (Takes 1/3 width on desktop) */}
            <div style={{ flex: '1', minWidth: '300px' }}>
                <CategoryPieChart />
            </div>
        </div>

        {/* --- BUDGETS (Full Width) --- */}
        <div style={{ marginBottom: '3rem' }}>
             <BudgetSection />
        </div>

        {/* --- HISTORY LIST (Full Width) --- */}
        <div>
            <TransactionList />
        </div>

      </div>

      {/* Wizard Modal */}
      {showWizard && <OnboardingWizard onClose={() => setShowWizard(false)} />}
      
    </div>
  );
};

export default Analytics;