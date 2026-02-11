import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar" style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          ← Back to Dashboard
        </Link>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '600px' }}>
          
          <h1 style={{ 
            fontSize: '2rem', marginBottom: '1rem', 
            background: 'linear-gradient(to right, #fff, #818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            About ExpenseTracker
          </h1>
          
          <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            ExpenseTracker is a modern financial management tool designed to help you track spending, set smart budgets, and visualize your financial health in real-time.
          </p>

          <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Features</h3>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '2rem', paddingLeft: '1.2rem' }}>
            <li>Smart "Safe to Spend" Calculator</li>
            <li>Category-wise Budget Planning</li>
            <li>Real-time Expense Logging</li>
            <li>Historical Data Grouping</li>
            <li>Dark Mode / Neon UI</li>
          </ul>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Version 2.0.0 (Neon)</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Designed by Senior Engineer</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default About;