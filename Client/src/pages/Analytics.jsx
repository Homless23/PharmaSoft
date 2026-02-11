import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const { transactions } = useContext(GlobalContext);

  // 1. Define Static Budget Limits (Will move to DB in later phase)
  const budgetLimits = {
    Food: 15000,
    Transportation: 8000,
    Entertainment: 5000,
    Healthcare: 10000,
    Housing: 35000,
    Utilities: 12000,
    Stationary: 2000,
    Other: 5000
  };

  // 2. Calculate Actual Spending per Category
  const categorySpending = {};
  transactions.forEach(t => {
    if (t.amount < 0) {
      const cat = t.category || 'Other';
      categorySpending[cat] = (categorySpending[cat] || 0) + Math.abs(t.amount);
    }
  });

  return (
    <div className="analytics-container">
      <div className="header-flex">
        <h2>Analytics & Budgets</h2>
        <button className="btn-secondary">✨ Auto-Set Budgets</button>
      </div>

      <div className="analytics-grid">
        {/* Charts remain in the top grid as we built before */}
        <div className="card chart-main"><h3>Spending Trend</h3>{/* Line Chart */}</div>
        <div className="card chart-side"><h3>Spending Split</h3>{/* Doughnut Chart */}</div>
      </div>

      {/* NEW: CATEGORY BUDGET UTILIZATION SECTION */}
      <div className="card budget-card">
        <h3 className="card-label">Category Budgets</h3>
        <div className="budget-grid">
          {Object.keys(budgetLimits).map(category => {
            const spent = categorySpending[category] || 0;
            const limit = budgetLimits[category];
            const percent = Math.min((spent / limit) * 100, 100);
            
            return (
              <div key={category} className="budget-row">
                <div className="budget-info">
                  <span className="cat-name">{category}</span>
                  <span className="cat-values">
                    Rs {spent.toLocaleString()} / <span className="text-muted">{limit.toLocaleString()}</span>
                  </span>
                </div>
                <div className="meter-track">
                  <div 
                    className={`meter-fill ${percent > 90 ? 'critical' : percent > 70 ? 'warning' : ''}`} 
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Analytics;