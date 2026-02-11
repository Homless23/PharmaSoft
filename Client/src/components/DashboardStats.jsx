import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';

const DashboardStats = () => {
  const { transactions } = useContext(GlobalContext);

  // Data Calculations
  const amounts = transactions.map(t => t.amount);
  const total = amounts.reduce((acc, item) => (acc += item), 0);
  const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
  const expense = Math.abs(amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0));

  // Fintech Logic: Monthly Budget Calculation
  const monthlyBudget = 75000; // This will eventually come from your Budget Page
  const percentUsed = Math.min((expense / monthlyBudget) * 100, 100).toFixed(1);
  const dailyLimit = (monthlyBudget / 30).toFixed(0);

  return (
    <section className="stats-grid">
      {/* Primary Metric: Available Budget */}
      <div className="stat-card primary-gradient">
        <div className="card-header">
          <span className="card-label">Available Budget</span>
          <span className="badge-pill">Feb</span>
        </div>
        <div className="main-metric">
          <span className="currency">Rs</span>
          <span className="number">{total.toLocaleString()}</span>
        </div>
       <div className="card-footer">
  <div className="footer-meta" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
    {/* The Green Dot Badge */}
    <span className="text-success" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
      ● {percentUsed}% Used
    </span>
    
    {/* The Divider Pipe */}
    <span style={{ color: '#4b5563' }}>|</span>
    
    {/* The Remaining Days */}
    <span className="text-muted">19 days remaining</span>
  </div>

  {/* Progress Bar */}
  <div className="progress-track">
    <div className="progress-fill" style={{ width: `${percentUsed}%` }}></div>
  </div>

  {/* Daily Tracker */}
  <div className="daily-tracker" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
    <span className="text-muted">Today's Spending</span>
    <span className="font-bold">Rs 0 / {dailyLimit}</span>
  </div>
</div>
      </div>

      {/* Secondary Metrics Group */}
      <div className="secondary-stats">
        <div className="stat-card">
          <div className="card-header">
            <span className="card-label">Monthly Income</span>
            <div className="icon-box-success">↑</div>
          </div>
          <div className="secondary-metric">
            <span className="currency-sm">Rs</span>
            <span className="number-sm">{income.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="card-header">
            <span className="card-label">Monthly Expense</span>
            <div className="icon-box-danger">↓</div>
          </div>
          <div className="secondary-metric">
            <span className="currency-sm">Rs</span>
            <span className="number-sm">{expense.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardStats;