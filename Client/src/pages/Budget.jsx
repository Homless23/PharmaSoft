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

  if (loading || !budget) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Loading budget...</div>
    </div>
  );

  const categories = Object.keys(budget.categoryLimits || {});

  return (
    <div style={{ minHeight: '100vh', padding: '40px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '800', 
            margin: '0 0 8px 0',
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px'
          }}>
            Budget Planning 💰
          </h1>
          <p style={{ 
            fontSize: '1rem',
            color: 'var(--text-muted)',
            margin: 0
          }}>
            Set and manage your spending limits
          </p>
        </div>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: isEditing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'var(--bg-app)',
            color: isEditing ? 'white' : 'var(--text-primary)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '0.95rem'
          }}
          onMouseEnter={(e) => !isEditing && (e.target.style.background = 'var(--border-subtle)')}
          onMouseLeave={(e) => !isEditing && (e.target.style.background = 'var(--bg-app)')}
        >
          {isEditing ? '✓ Save Changes' : '✎ Edit Limits'}
        </button>
      </div>

      {/* Budget Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {categories.map((cat) => {
          const spent = calculateSpent(cat);
          const limit = isEditing ? formData.categoryLimits[cat] : budget.categoryLimits[cat];
          const percent = limit > 0 ? (spent / limit * 100) : 0;
          
          let statusColor, statusText, statusBg;
          if (percent >= 100) {
            statusColor = '#ef4444';
            statusText = '🔴 Overspent';
            statusBg = 'rgba(239, 68, 68, 0.1)';
          } else if (percent >= 80) {
            statusColor = '#f59e0b';
            statusText = '🟡 Caution';
            statusBg = 'rgba(245, 158, 11, 0.1)';
          } else {
            statusColor = '#10b981';
            statusText = '🟢 On Track';
            statusBg = 'rgba(16, 185, 129, 0.1)';
          }

          const categoryEmojis = {
            'Food': '🍔', 'Transportation': '🚗', 'Healthcare': '🏥', 
            'Entertainment': '🎬', 'Housing': '🏠', 'Utilities': '💡', 
            'Stationary': '📝', 'Other': '📦'
          };

          return (
            <div
              key={cat}
              style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'}
            >
              {/* Category Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '2rem' }}>{categoryEmojis[cat] || '📦'}</span>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                      {cat}
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      background: statusBg,
                      color: statusColor,
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      display: 'inline-block',
                      marginTop: '4px'
                    }}>
                      {statusText}
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Display */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '16px',
                background: 'var(--bg-app)',
                borderRadius: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Spent</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                    Rs {spent.toFixed(2)}
                  </div>
                </div>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Limit</div>
                    <input
                      type="number"
                      value={formData.categoryLimits[cat] || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        categoryLimits: { ...formData.categoryLimits, [cat]: Number(e.target.value) }
                      })}
                      style={{
                        width: '140px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '2px solid #667eea',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontWeight: '800',
                        fontSize: '1.2rem',
                        textAlign: 'right'
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Limit</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      Rs {limit.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Progress</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: statusColor }}>
                    {Math.min(Math.round(percent), 100)}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '12px',
                  background: 'var(--bg-app)',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      width: `${Math.min(percent, 100)}%`,
                      height: '100%',
                      background: statusColor,
                      borderRadius: '10px',
                      transition: 'width 0.3s ease'
                    }}
                  ></div>
                </div>
              </div>

              {/* Remaining Info */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'var(--bg-app)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-muted)'
              }}>
                <span>{percent >= 100 ? '⚠️ Over by' : '✓ Remaining:'}</span> <span style={{ fontWeight: '700', color: statusColor }}>Rs {Math.abs(limit - spent).toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips Section */}
      <div style={{
        marginTop: '50px',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
            💡 Budget Tips
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>50/30/20 Rule</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Allocate 50% to needs, 30% to wants, 20% to savings</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>Track Weekly</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Review spending weekly to catch overspending early</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>Adjust Monthly</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Update budgets based on actual spending patterns</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budget;