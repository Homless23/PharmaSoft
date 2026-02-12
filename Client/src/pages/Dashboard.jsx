import React, { useContext, useEffect, useMemo } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Dashboard = () => {
  const { summary, getSummary, user } = useContext(GlobalContext);

  useEffect(() => {
    getSummary();
    // eslint-disable-next-line
  }, []);

  const totals = useMemo(() => {
    if (summary) {
      return {
        total: (summary.totalIncome + summary.totalExpense).toFixed(2),
        income: summary.totalIncome.toFixed(2),
        expense: Math.abs(summary.totalExpense).toFixed(2),
        count: summary.transactionCount
      };
    }
    return { total: '0.00', income: '0.00', expense: '0.00', count: 0 };
  }, [summary]);

  return (
    <div style={{ minHeight: '100vh', padding: '40px 0' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '50px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800', 
              margin: '0 0 8px 0',
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px'
            }}>
              Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
            </h1>
            <p style={{ 
              fontSize: '1rem',
              color: 'var(--text-muted)',
              margin: 0
            }}>
              Here's your financial overview for this month
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Main Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {/* Total Balance - Primary Card */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '32px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(102, 126, 234, 0.15)',
          border: 'none'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              fontSize: '0.85rem',
              fontWeight: '600',
              opacity: 0.9,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              Total Balance
            </div>
            <div style={{ 
              fontSize: '3rem',
              fontWeight: '800',
              marginBottom: '16px',
              lineHeight: '1'
            }}>
              Rs {totals.total}
            </div>
            <div style={{
              fontSize: '0.9rem',
              opacity: 0.85,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                fontSize: '1.2rem'
              }}>📈</span>
              <span>+2.4% from last month</span>
            </div>
          </div>
        </div>

        {/* Income Card */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '16px',
          padding: '32px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(16, 185, 129, 0.15)',
          border: 'none'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              fontSize: '0.85rem',
              fontWeight: '600',
              opacity: 0.9,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              Total Income
            </div>
            <div style={{ 
              fontSize: '2.5rem',
              fontWeight: '800',
              marginBottom: '16px',
              lineHeight: '1'
            }}>
              Rs {totals.income}
            </div>
            <div style={{
              fontSize: '0.9rem',
              opacity: 0.85
            }}>
              {totals.count} transactions
            </div>
          </div>
        </div>

        {/* Expense Card */}
        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          borderRadius: '16px',
          padding: '32px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(239, 68, 68, 0.15)',
          border: 'none'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              fontSize: '0.85rem',
              fontWeight: '600',
              opacity: 0.9,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              Total Expenses
            </div>
            <div style={{ 
              fontSize: '2.5rem',
              fontWeight: '800',
              marginBottom: '16px',
              lineHeight: '1'
            }}>
              Rs {totals.expense}
            </div>
            <div style={{
              fontSize: '0.9rem',
              opacity: 0.85
            }}>
              Tracked this month
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Analytics Placeholder */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {/* Quick Insights Card */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '20px'
          }}>
            Quick Insights
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: 'var(--bg-app)',
              borderRadius: '12px'
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Avg Daily Spend</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Rs {(totals.expense / 30).toFixed(2)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: 'var(--bg-app)',
              borderRadius: '12px'
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Saving Rate</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>
                {totals.income > 0 ? ((totals.income / (totals.income + parseFloat(totals.expense)) * 100).toFixed(1)) : '0'}%
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: 'var(--bg-app)',
              borderRadius: '12px'
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Transactions</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {totals.count}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          gridColumn: 'span 1'
        }}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '20px'
          }}>
            Getting Started
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--bg-app)',
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '1.4rem' }}>📊</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>View Analytics</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Analyze spending patterns</div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--bg-app)',
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '1.4rem' }}>💰</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Set Budget</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Start spending goals</div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--bg-app)',
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '1.4rem' }}>📈</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Track Categories</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Organize transactions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;