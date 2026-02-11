import React, { useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Analytics = () => {
  const { transactions, getTransactions } = useContext(GlobalContext);

  useEffect(() => {
    getTransactions();
    // eslint-disable-next-line
  }, []);

  // Grouping logic for categories
  const categoryTotals = transactions.reduce((acc, t) => {
    if (t.amount < 0) {
      const cat = t.category || 'Other';
      acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
    }
    return acc;
  }, {});

  const styles = {
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' },
    catCard: {
      background: 'var(--bg-card)',
      padding: '20px',
      borderRadius: '16px',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    progressBar: (percent) => ({
      height: '8px',
      width: '100%',
      background: 'var(--bg-app)',
      borderRadius: '10px',
      marginTop: '10px',
      position: 'relative',
      overflow: 'hidden'
    }),
    progressFill: (percent) => ({
      width: `${percent}%`,
      height: '100%',
      background: 'var(--primary)',
      borderRadius: '10px'
    })
  };

  const totalExpense = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Spending Analytics</h1>
      <p style={{ color: 'var(--text-muted)' }}>Where your money goes</p>

      <div style={styles.grid}>
        {Object.entries(categoryTotals).map(([cat, amt]) => {
          const percent = ((amt / totalExpense) * 100).toFixed(0);
          return (
            <div key={cat} style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600 }}>{cat}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{percent}%</span>
              </div>
              <div style={styles.progressBar()}>
                <div style={styles.progressFill(percent)}></div>
              </div>
              <p style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Total: Rs {amt.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Analytics;