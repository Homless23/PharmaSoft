import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../context/GlobalState';
import Pagination from '../components/Pagination';

const History = () => {
  const { transactions, getTransactionsByPage, deleteTransaction, pagination } = useContext(GlobalContext);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = pagination.limit || 10;

  useEffect(() => {
    getTransactionsByPage(1, itemsPerPage);
    // eslint-disable-next-line
  }, []);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    getTransactionsByPage(newPage, itemsPerPage);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    },
    emptyState: {
      padding: '40px 20px',
      textAlign: 'center',
      color: 'var(--text-muted)'
    }
  };

  return (
    <div style={styles.container}>
      <header>
        <h1 style={{ fontWeight: 800 }}>Audit Logs</h1>
        <p style={{ color: 'var(--text-muted)' }}>Complete transaction history and ledger</p>
      </header>

      <div style={styles.tableCard}>
        {transactions.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No transactions found</p>
          </div>
        ) : (
          <>
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
            {pagination.pages && pagination.pages > 1 && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.pages}
                total={pagination.total}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default History;