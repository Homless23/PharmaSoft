import React, { useEffect, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import DashboardStats from '../components/DashboardStats';
import TransactionList from '../components/TransactionList';

const Dashboard = () => {
  const { getTransactions, transactions, loading } = useContext(GlobalContext);

  useEffect(() => {
    getTransactions();
    // eslint-disable-next-line
  }, []);

  if (loading) return <div className="loader">Refreshing Dashboard...</div>;

  return (
    <div className="dashboard-wrapper">
      {/* High-Level Financial Metrics */}
      <DashboardStats />

      <div className="dashboard-grid-premium">
        {/* Main Feed */}
        <div className="grid-item-main">
          <TransactionList title="Recent Activity" />
        </div>

        {/* Side Insights */}
        <div className="grid-item-side">
          <div className="card primary-gradient">
            <h3 className="card-label">Monthly Goal</h3>
            <div className="goal-content">
              <span className="number">85%</span>
              <p className="text-muted">of your savings target reached for February.</p>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: '85%' }}></div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 className="card-label">Quick Tip</h3>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
              You spent 15% more on <strong>Food</strong> this week compared to last. Consider checking your budget.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;