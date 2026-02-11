import React, { useState, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Budget = () => {
  // In a production app, these would be fetched from a 'budgets' collection in MongoDB
  const [budgets, setBudgets] = useState({
    Food: 15000,
    Transportation: 8000,
    Entertainment: 5000,
    Healthcare: 10000,
    Housing: 35000,
    Utilities: 12000,
    Stationary: 2000,
    Other: 5000
  });

  const handleUpdate = (category, value) => {
    setBudgets({ ...budgets, [category]: Number(value) });
  };

  const totalAllocated = Object.values(budgets).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="container budget-page">
      <div className="header-flex">
        <h2>Budget Planning</h2>
        <div className="allocation-summary glass">
          <span className="text-muted">Total Monthly Allocation:</span>
          <span className="font-bold"> Rs {totalAllocated.toLocaleString()}</span>
        </div>
      </div>

      <div className="card budget-form-card">
        <div className="budget-settings-grid">
          {Object.entries(budgets).map(([category, limit]) => (
            <div key={category} className="budget-setting-row">
              <div className="setting-info">
                <span className="setting-label">{category}</span>
                <p className="text-muted text-sm">Monthly limit for {category.toLowerCase()}</p>
              </div>
              <div className="setting-input-wrapper">
                <span className="currency-prefix">Rs</span>
                <input 
                  type="number" 
                  value={limit} 
                  onChange={(e) => handleUpdate(category, e.target.value)}
                  className="budget-input"
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="form-footer">
          <button className="btn-primary" style={{ width: 'auto', padding: '12px 40px' }}>
            Save Budget Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default Budget;