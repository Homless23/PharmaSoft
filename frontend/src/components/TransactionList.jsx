import React from 'react';
import { useGlobalContext } from '../context/globalContext';
import { getCategoryIcon } from '../utils/categoryIcons';

const formatAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString() : '0';
};

const formatDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleDateString();
};

const TransactionList = () => {
  const { expenses, deleteExpense } = useGlobalContext();

  return (
    <div className="card">
      <h3 className="section-title">Full Transaction History</h3>

      {expenses.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
          No transactions recorded yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {expenses.map((expense) => (
            <div
              key={expense._id}
              className="transaction-item"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem'
                  }}
                >
                  {getCategoryIcon(expense.category, expense.type)}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: '500' }}>{expense.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {formatDate(expense.date)} | {expense.category}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <span style={{ fontWeight: '600', color: '#fff', fontSize: '1rem' }}>
                  - Rs {formatAmount(expense.amount)}
                </span>
                <button
                  onClick={() => deleteExpense(expense._id)}
                  className="delete-btn"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    opacity: 0.6,
                    transition: 'opacity 0.2s'
                  }}
                  title="Delete Transaction"
                  onMouseOver={(e) => {
                    e.target.style.opacity = '1';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.opacity = '0.6';
                  }}
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionList;
