import React, { useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Dashboard = () => {
  const { transactions, getTransactions, user } = useContext(GlobalContext);

  useEffect(() => {
    getTransactions();
    // eslint-disable-next-line
  }, []);

  // --- Logic ---
  const amounts = transactions.map(t => t.amount);
  const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);
  const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0).toFixed(2);
  const expense = (amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1).toFixed(2);

  // --- Inline Styles ---
  const styles = {
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      marginTop: '30px'
    },
    card: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      padding: '24px',
      borderRadius: '20px',
      position: 'relative',
      overflow: 'hidden'
    },
    label: { color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' },
    value: { fontSize: '2rem', fontWeight: '800', margin: '8px 0', color: 'var(--text-primary)' },
    accent: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: '4px',
      height: '100%',
      background: 'var(--primary)'
    }
  };

  return (
    <div>
      <header>
        <h1 style={{ fontWeight: 800 }}>Fintech Command Center</h1>
        <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.name || 'User'}</p>
      </header>

      <div style={styles.grid}>
        {/* Total Balance Card */}
        <div style={styles.card}>
          <div style={styles.accent}></div>
          <span style={styles.label}>Total Balance</span>
          <h2 style={styles.value}>Rs {total}</h2>
          <span style={{ color: '#10b981', fontSize: '0.85rem' }}>↑ 2.4% from last month</span>
        </div>

        {/* Income Card */}
        <div style={{ ...styles.card, borderColor: '#10b981' }}>
          <span style={styles.label}>Total Income</span>
          <h2 style={{ ...styles.value, color: '#10b981' }}>Rs {income}</h2>
        </div>

        {/* Expense Card */}
        <div style={{ ...styles.card, borderColor: '#ef4444' }}>
          <span style={styles.label}>Total Expenses</span>
          <h2 style={{ ...styles.value, color: '#ef4444' }}>Rs {expense}</h2>
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: '40px', textAlign: 'center', minHeight: '200px' }}>
         <p style={{ color: 'var(--text-muted)', marginTop: '80px' }}>Visualizing your spending data...</p>
      </div>
    </div>
  );
};

export default Dashboard;