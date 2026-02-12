import React, { useState } from 'react';
import { useGlobalContext } from '../context/globalContext';

const CURRENCY = { symbol: 'Rs' };
const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Bills', 'Health', 'Shopping', 'Other'];

const ExpenseForm = () => {
  const { addExpense } = useGlobalContext();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    setIsSubmitting(true);
    const success = await addExpense({
      title: title.trim(),
      amount: parsedAmount,
      category,
      description: title.trim(),
      date
    });
    setIsSubmitting(false);

    if (!success) {
      return;
    }

    setTitle('');
    setAmount('');
  };

  const baseInputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 16px',
    fontSize: '1rem',
    background: '#27272a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s'
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = '#3b82f6';
    e.target.style.background = '#09090b';
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    e.target.style.background = '#27272a';
  };

  return (
    <div
      className="card"
      style={{
        background: '#18181b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '2rem',
        maxWidth: '500px',
        margin: '0 auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
    >
      <h3 style={{ margin: '0 0 1.5rem 0', textAlign: 'center', fontSize: '1.25rem', color: '#fff' }}>
        Log New Expense
      </h3>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#09090b',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '1rem 1.5rem',
              transition: 'border-color 0.2s'
            }}
          >
            <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#71717a', marginRight: '0.5rem' }}>
              {CURRENCY.symbol}
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '2.5rem',
                fontWeight: '700',
                width: '100%',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa', fontSize: '0.85rem' }}>
            Description
          </label>
          <input
            type="text"
            placeholder="e.g. Grocery Shopping"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={baseInputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa', fontSize: '0.85rem' }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...baseInputStyle, appearance: 'none', cursor: 'pointer' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa', fontSize: '0.85rem' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ ...baseInputStyle, cursor: 'pointer' }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
          style={{
            marginTop: '1.5rem',
            width: '100%',
            padding: '16px',
            fontSize: '1rem',
            fontWeight: '600',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            background: 'var(--brand-color)',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
          }}
        >
          {isSubmitting ? 'Saving...' : 'Add Transaction'}
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
