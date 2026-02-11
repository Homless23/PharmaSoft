import React, { useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';

const History = () => {
  const { transactions, getTransactions, deleteTransaction } = useContext(GlobalContext);

  useEffect(() => {
    getTransactions();
    // eslint-disable-next-line
  }, []);

  const styles = {
    container: { padding: '20px' },
    tableCard: {
      background: 'var(--bg-card)',
      borderRadius: '20px',
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden',
      marginTop: '24px'
    },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { 
      padding: '16px', 
      background: 'rgba(255,255,255,0.03)', 
      color: 'var(--text-muted)', 
      fontSize: '0.85rem',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    td: { 
      padding: '16px', 
      borderTop: '1px solid var(--border-subtle)',
      fontSize: '0.95rem' 
    },
    amount: (amt) => ({
      fontWeight: '700',
      color: amt < 0 ? '#ef4444' : '#10b981'
    }),
    deleteBtn: {
      background: 'none',
      border: 'none',
      color: '#ef4444',
      cursor: 'pointer',
      fontSize: '1.1rem',
      opacity: 0.7
    }
  };

  return (
    <div style={styles.container}>
      <header>
        <h1 style={{ fontWeight: 800 }}>Audit Logs</h1>
        <p style={{ color: 'var(--text-muted)' }}>Complete transaction history and ledger</p>
      </header>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t._id}>
                <td style={styles.td}>{new Date(t.createdAt).toLocaleDateString()}</td>
                <td style={styles.td}>{t.text}</td>
                <td style={styles.td}>
                  <span style={{ background: 'var(--primary-glow)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                    {t.category || 'General'}
                  </span>
                </td>
                <td style={{ ...styles.td, ...styles.amount(t.amount) }}>
                  {t.amount < 0 ? '-' : '+'} Rs {Math.abs(t.amount).toFixed(2)}
                </td>
                <td style={styles.td}>
                  <button style={styles.deleteBtn} onClick={() => deleteTransaction(t._id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default History;