import React, { useState } from 'react';
import { useGlobalContext } from '../context/globalContext';

const OnboardingWizard = ({ onClose }) => {
  const { autoAllocateBudgets, getData } = useGlobalContext();
  const [income, setIncome] = useState('');
  const [savingsRate, setSavingsRate] = useState(20);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);

  const handleAutoBudget = async () => {
    const monthlyIncome = Number(income);
    if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) return;

    setIsSaving(true);
    const savingsBudget = monthlyIncome * (Number(savingsRate || 0) / 100);
    const result = await autoAllocateBudgets({
      income: monthlyIncome,
      savingsTarget: savingsBudget,
      apply: true
    });
    if (result.success) {
      await getData({ force: true });
      setStep(2);
    }
    setIsSaving(false);
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        {step === 1 ? (
          <>
            <h2>Smart Budget Assistant</h2>
            <p>Set your income once and distribute category budgets using a realistic split.</p>
            <input
              className="input"
              type="number"
              placeholder="Monthly income"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
            <div style={{ marginTop: '0.8rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem' }}>Savings Goal: {savingsRate}%</label>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={savingsRate}
                onChange={(e) => setSavingsRate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.2rem' }}>
              <button className="primary-btn" disabled={isSaving || !income} onClick={handleAutoBudget}>
                {isSaving ? 'Applying...' : 'Apply Plan'}
              </button>
              <button className="ghost-btn" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <h2>Budgets Applied</h2>
            <p>All categories were updated based on your income and savings preference.</p>
            <button className="primary-btn" onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
