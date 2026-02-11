import React from 'react';
import { Link } from 'react-router-dom';
import ExpenseForm from '../components/ExpenseForm';

const AddTransaction = () => {
  return (
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar" style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ textDecoration: 'none', fontWeight: '900', fontSize: '1.5rem', color: 'var(--text-secondary)' }}>
          ExpenseTracker
        </Link>
        <div className="nav-links" style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500' }}>Dashboard</Link>
            <Link to="/add" style={{ color: '#fff', textDecoration: 'none', fontWeight: '700' }}>+ Add</Link>
            <Link to="/analytics" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500' }}>Analytics</Link>
        </div>
      </nav>

      {/* CENTERED FORM */}
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1rem' }}>
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>Log New Expense</h2>
        <ExpenseForm />
      </div>
    </div>
  );
};

export default AddTransaction;