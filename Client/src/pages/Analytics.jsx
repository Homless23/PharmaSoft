import React, { useContext, useEffect, useMemo } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Analytics = () => {
  const { analytics, getAnalytics } = useContext(GlobalContext);

  useEffect(() => {
    getAnalytics();
    // eslint-disable-next-line
  }, []);

  const categoryTotals = analytics?.categories || {};
  const totalExpense = analytics?.totalExpense || 0;

  const categoryData = useMemo(() => {
    return Object.entries(categoryTotals)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryTotals, totalExpense]);

  const colors = [
    '#667eea', '#764ba2', '#10b981', '#f59e0b', 
    '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '40px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '50px' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: '800', 
          margin: '0 0 8px 0',
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px'
        }}>
          Spending Analytics 📊
        </h1>
        <p style={{ 
          fontSize: '1rem',
          color: 'var(--text-muted)',
          margin: 0
        }}>
          Understand where your money goes each month
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Total Expenses
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Rs {totalExpense.toFixed(2)}
          </div>
        </div>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Categories
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {categoryData.length}
          </div>
        </div>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Avg Per Category
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Rs {(categoryData.length > 0 ? totalExpense / categoryData.length : 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        <h2 style={{
          fontSize: '1.3rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginTop: 0,
          marginBottom: '30px'
        }}>
          Breakdown by Category
        </h2>

        {categoryData.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💸</div>
            <p>No expense data yet. Start tracking to see your breakdown!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {categoryData.map((item, idx) => {
              const color = colors[idx % colors.length];
              return (
                <div key={item.category}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '6px',
                        background: color
                      }}></div>
                      <span style={{
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}>
                        {item.category}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <span style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        fontWeight: '500'
                      }}>
                        {item.percentage}%
                      </span>
                      <span style={{
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        minWidth: '120px',
                        textAlign: 'right'
                      }}>
                        Rs {item.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--bg-app)',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${item.percentage}%`,
                      height: '100%',
                      background: color,
                      borderRadius: '10px',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spending Insights */}
      <div style={{
        marginTop: '40px',
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        <h2 style={{
          fontSize: '1.3rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginTop: 0,
          marginBottom: '24px'
        }}>
          💡 Insights
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {categoryData.length > 0 && (
            <>
              <div style={{
                padding: '16px',
                background: 'var(--bg-app)',
                borderRadius: '12px',
                borderLeft: `4px solid ${colors[0]}`
              }}>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  🎯 Highest Spending
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {categoryData[0].category} accounts for {categoryData[0].percentage}% of your expenses (Rs {categoryData[0].amount.toFixed(2)})
                </div>
              </div>
              <div style={{
                padding: '16px',
                background: 'var(--bg-app)',
                borderRadius: '12px',
                borderLeft: `4px solid #10b981`
              }}>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  ✅ Recommendation
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Review your top spending category and look for opportunities to optimize
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;