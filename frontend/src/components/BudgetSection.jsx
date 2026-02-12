import React, { useContext, useState } from 'react';
import { GlobalContext } from '../context/globalContext';

const BudgetSection = () => {
  const { categories, expenses, editBudget } = useContext(GlobalContext);
  const [editingId, setEditingId] = useState(null);
  const [tempBudget, setTempBudget] = useState(0);

  // Helper: Get spent amount for a category
  const getSpent = (catName) => {
    return expenses
      .filter(e => e.category === catName)
      .reduce((acc, item) => acc + item.amount, 0);
  };

  const startEditing = (cat) => {
    setEditingId(cat._id);
    setTempBudget(cat.budget);
  };

  const saveEditing = (id) => {
    editBudget(id, parseInt(tempBudget));
    setEditingId(null);
  };

  return (
    <div className="card" style={{ height: '100%' }}>
      <h3 className="section-title">Category Budgets</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {categories.map(cat => {
            const spent = getSpent(cat.name);
            const budget = cat.budget || 0;
            const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            
            // Color Logic
            let barColor = '#3b82f6'; // Blue
            if (percentage > 70) barColor = '#f59e0b'; // Orange
            if (percentage > 95) barColor = '#ef4444'; // Red

            return (
                <div key={cat._id}>
                    {/* Header Row: Name & Edit Input */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500', color: '#fff' }}>{cat.name}</span>
                        
                        {editingId === cat._id ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input 
                                    type="number" 
                                    value={tempBudget} 
                                    onChange={(e) => setTempBudget(e.target.value)}
                                    style={{ 
                                        width: '80px', background: '#09090b', border: '1px solid #3b82f6', 
                                        borderRadius: '6px', color: '#fff', padding: '2px 8px', outline: 'none' 
                                    }}
                                    autoFocus
                                />
                                <button onClick={() => saveEditing(cat._id)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}>✓</button>
                            </div>
                        ) : (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', cursor: 'pointer' }} onClick={() => startEditing(cat)}>
                                Rs {spent.toLocaleString()} / <span style={{ color: '#fff' }}>{budget.toLocaleString()}</span> ✎
                            </div>
                        )}
                    </div>

                    {/* Progress Bar Container */}
                    <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${percentage}%`,
                            background: barColor,
                            borderRadius: '4px',
                            transition: 'width 0.5s ease',
                            boxShadow: `0 0 10px ${barColor}50` // Neon Glow
                        }}></div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default BudgetSection;