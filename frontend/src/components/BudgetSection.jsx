import React, { useState } from 'react';
import { useGlobalContext } from '../context/globalContext';

const BudgetSection = ({ minimal = false }) => {
  const { categories, expenses, editBudget } = useGlobalContext();
  const [editingId, setEditingId] = useState(null);
  const [tempBudget, setTempBudget] = useState(0);

  const getSpent = (catName) =>
    expenses
      .filter((e) => e.category === catName && (e.type || 'expense') === 'expense')
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const startEditing = (cat) => {
    setEditingId(cat._id);
    setTempBudget(cat.budget || 0);
  };

  const saveEditing = async (id) => {
    await editBudget(id, Number(tempBudget) || 0);
    setEditingId(null);
  };

  return (
    <div className={`card ${minimal ? 'budget-card-minimal' : ''}`}>
      <h3 className="section-title">Budget by Category</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {categories.map((cat) => {
          const spent = getSpent(cat.name);
          const budget = Number(cat.budget || 0);
          const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

          let barColor = '#22c55e';
          if (percentage >= 70) barColor = '#f59e0b';
          if (percentage >= 90) barColor = '#ef4444';

          return (
            <div key={cat._id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>{cat.name}</span>
                {editingId === cat._id ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      value={tempBudget}
                      onChange={(e) => setTempBudget(e.target.value)}
                      className="input compact"
                      style={{ width: '90px' }}
                    />
                    <button className="ghost-btn" onClick={() => saveEditing(cat._id)}>Save</button>
                  </div>
                ) : (
                  <button className="ghost-btn" onClick={() => startEditing(cat)}>
                    Rs {spent.toLocaleString()} / {budget.toLocaleString()}
                  </button>
                )}
              </div>

              <div className="progress-track" style={{ background: 'rgba(255,255,255,0.24)', height: '10px' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${percentage}%`,
                    background: barColor,
                    boxShadow: `0 0 12px ${barColor}`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetSection;
