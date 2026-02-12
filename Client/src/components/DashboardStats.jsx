import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { SkeletonBase } from './Skeleton';

const DashboardStats = () => {
  const { transactions, loading } = useContext(GlobalContext);

  if (loading) {
    return (
      <div className="stats-container-modern">
        <div className="stat-card balance-main primary-gradient skeleton-loading">
          <SkeletonBase width="30%" height="15px" />
          <SkeletonBase width="60%" height="50px" style={{ margin: '20px 0' }} />
          <SkeletonBase width="40%" height="10px" />
        </div>
        <div className="stats-split">
          <div className="stat-card"><SkeletonBase width="100%" height="80px" /></div>
          <div className="stat-card"><SkeletonBase width="100%" height="80px" /></div>
        </div>
      </div>
    );
  }

  const amounts = transactions.map(t => t.amount);
  const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);
  const income = amounts.filter(i => i > 0).reduce((acc, i) => (acc += i), 0).toFixed(2);
  const expense = (amounts.filter(i => i < 0).reduce((acc, i) => (acc += i), 0) * -1).toFixed(2);

  return (
    <div className="stats-container-modern">
      <div className="stat-card balance-main primary-gradient">
        <h3 className="card-label">Total Balance</h3>
        <div className="main-metric">
          <span className="currency">Rs</span>
          <span className="number">{total}</span>
        </div>
        <div className="stat-footer">
          <span className="text-success">↑ 2.4%</span>
          <span className="text-muted ml-2">from last month</span>
        </div>
      </div>

      <div className="stats-split">
        <div className="stat-card">
          <h3 className="card-label">Income</h3>
          <div className="split-metric text-success">Rs {income}</div>
        </div>
        <div className="stat-card">
          <h3 className="card-label">Expense</h3>
          <div className="split-metric text-danger">Rs {expense}</div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardStats);