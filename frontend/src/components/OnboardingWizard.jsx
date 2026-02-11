import React, { useState, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';

const OnboardingWizard = ({ onClose }) => {
  const { categories, editBudget } = useContext(GlobalContext);
  
  // STATE
  const [income, setIncome] = useState('');
  const [savingsRate, setSavingsRate] = useState(20); // Default to 20%
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // CONSTANTS
  const NEEDS = ['Bills', 'Transport', 'Health', 'Housing'];
  const SAVINGS = ['Savings', 'Investments'];

  const handleAutoBudget = async () => {
    if (!income) return;
    setLoading(true);

    const monthlyIncome = parseFloat(income);

    // 1. Calculate Savings based on USER INPUT
    const savingsBudget = monthlyIncome * (savingsRate / 100);
    
    // 2. Calculate Remainder for Needs/Wants
    const remainder = monthlyIncome - savingsBudget;
    
    // 3. Split Remainder (roughly 60% Needs / 40% Wants to keep the balance)
    const needsBudget = remainder * 0.60; 
    const wantsBudget = remainder * 0.40;

    // 4. Identify Categories
    const needsCats = categories.filter(c => NEEDS.includes(c.name));
    const savingsCats = categories.filter(c => SAVINGS.includes(c.name));
    // Catch-all: Everything else is a "Want"
    const wantsCats = categories.filter(c => !NEEDS.includes(c.name) && !SAVINGS.includes(c.name));

    // 5. Calculate per-category limits
    const limitPerNeed = needsCats.length > 0 ? Math.floor(needsBudget / needsCats.length) : 0;
    const limitPerWant = wantsCats.length > 0 ? Math.floor(wantsBudget / wantsCats.length) : 0;
    const limitPerSave = savingsCats.length > 0 ? Math.floor(savingsBudget / savingsCats.length) : 0;

    // 6. Push Updates
    const updatePromises = [];
    needsCats.forEach(cat => updatePromises.push(editBudget(cat._id, limitPerNeed)));
    savingsCats.forEach(cat => updatePromises.push(editBudget(cat._id, limitPerSave)));
    wantsCats.forEach(cat => updatePromises.push(editBudget(cat._id, limitPerWant)));

    await Promise.all(updatePromises);

    setLoading(false);
    setStep(2);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.85)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)'
    }}>
      <div className="glass-card" style={{ 
          maxWidth: '500px', width: '90%', padding: '2rem', textAlign: 'center', 
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#09090b',
          color: '#ffffff'
      }}>
        
        {step === 1 ? (
          <>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff' }}>✨ Smart Budget Tool</h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.6' }}>
              We will set aside your <strong>Savings</strong> first, then split the rest between Needs & Wants.
            </p>

            {/* INPUT 1: INCOME */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>Monthly Income</label>
              <input 
                type="number" 
                placeholder="e.g. 50000" 
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                style={{
                  width: '100%', padding: '1rem', fontSize: '1.2rem',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px', color: '#fff', outline: 'none'
                }}
                autoFocus
              />
            </div>

            {/* INPUT 2: SAVINGS SLIDER */}
            <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Savings Goal</label>
                <span style={{ color: '#34d399', fontWeight: 'bold' }}>{savingsRate}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="80" step="5"
                value={savingsRate}
                onChange={(e) => setSavingsRate(e.target.value)}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#34d399' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                This allocates <strong>{income ? (parseFloat(income) * (savingsRate/100)).toLocaleString() : 0}</strong> to savings immediately.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  onClick={handleAutoBudget} 
                  disabled={loading || !income}
                  className="btn-primary"
                  style={{ width: '100%', padding: '1rem', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Calculating...' : '🚀 Set My Budgets'}
                </button>
            </div>
            
            <button 
                onClick={onClose} 
                style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
                Cancel
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ marginBottom: '1rem', color: '#ffffff' }}>Budgets Updated!</h2>
            
            <p style={{ color: '#cbd5e1', marginBottom: '2rem', fontSize: '1.1rem' }}>
              We allocated <strong>{savingsRate}%</strong> to Savings and distributed the rest across <strong>{categories.length}</strong> categories.
            </p>
            
            <button 
              onClick={onClose} 
              className="btn-primary"
              style={{ width: '100%', padding: '1rem' }}
            >
              Awesome, thanks!
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;