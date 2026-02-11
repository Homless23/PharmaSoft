import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';
import CategoryChart from '../components/CategoryChart';
import TrendChart from '../components/TrendChart';

const Analytics = () => {
  const { transactions, getTransactions, loading } = useContext(GlobalContext);
  const [filterCategory, setFilterCategory] = useState('All');
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    getTransactions();
    // eslint-disable-next-line
  }, []);

  // Filter Logic
  const filteredData = transactions.filter(t => {
    const categoryMatch = filterCategory === 'All' || t.category === filterCategory;
    
    if (dateRange === 'all') return categoryMatch;
    
    const transDate = new Date(t.createdAt);
    const now = new Date();
    if (dateRange === 'month') {
      return categoryMatch && transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
    }
    return categoryMatch;
  });

  if (loading) return <div className="loader">Processing Financial Data...</div>;

  return (
    <div className="analytics-page">
      <header className="page-header-flex">
        <h2 className="page-title">Spending Analytics</h2>
        <div className="filter-group-premium">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="month">This Month</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Food">Food</option>
            <option value="Transportation">Transportation</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Housing">Housing</option>
            <option value="Utilities">Utilities</option>
            <option value="Stationary">Stationary</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </header>

      <div className="analytics-grid">
        <div className="card chart-card main-chart">
          <h3 className="card-label">Monthly Spending Trend</h3>
          <TrendChart data={filteredData} />
        </div>
        <div className="card chart-card side-chart">
          <h3 className="card-label">Category Distribution</h3>
          <CategoryChart data={filteredData} />
        </div>
      </div>
    </div>
  );
};

export default Analytics;