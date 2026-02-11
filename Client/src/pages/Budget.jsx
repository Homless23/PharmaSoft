import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Budget = () => {
  const { transactions, budget, getBudget, updateBudget, loading } = useContext(GlobalContext);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    getBudget();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (budget) setFormData(budget);
  }, [budget]);

  const calculateSpent = (category) => {
    return transactions
      .filter(t => t.category === category && t.amount < 0)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  };

  const handleSave = async () => {
    await updateBudget(formData);
    setIsEditing(false);
  };

  if (loading || !budget) return <div className="loader">Loading Goals...</div>;

  const categories = Object.keys(budget.categoryLimits);

  return (
    <div className="budget-page">
      <header className="page-header-flex">
        <h2 className="page-title">Budget Planning</h2>
        <button className="btn-primary" onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
          {isEditing ? 'Save Budgets' : 'Edit Limits'}
        </button>
      </header>

      <div className="budget-grid">
        {categories.map(cat => {
          const spent = calculateSpent(cat);
          const limit = isEditing ? formData.categoryLimits[cat] : budget.categoryLimits[cat];
          const percent = limit > 0 ? (spent / limit) * 100 : 0;
          const statusClass = percent >= 100 ? 'danger' : percent >= 80 ? 'warning' : 'success';

          return (
            <div key={cat} className="card budget-card">
              <div className="budget-info">
                <span className="cat-name">{cat}</span>
                <span className={`cat-status ${statusClass}`}>
                  {percent >= 100 ? 'Overspent' : `${Math.round(percent)}% Used`}
                </span>
              </div>
              
              <div className="budget-math">
                <span className="spent">Rs {spent}</span>
                {isEditing ? (
                  <input 
                    type="number" 
                    className="budget-input"
                    value={formData.categoryLimits[cat]} 
                    onChange={(e) => setFormData({
                      ...formData, 
                      categoryLimits: { ...formData.categoryLimits, [cat]: Number(e.target.value) }
                    })}
                  />
                ) : (
                  <span className="limit">of Rs {limit}</span>
                )}
              </div>

              <div className="progress-track-large">
                <div 
                  className={`progress-fill-large ${statusClass}`} 
                  style={{ width: `${Math.min(percent, 100)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Budget;