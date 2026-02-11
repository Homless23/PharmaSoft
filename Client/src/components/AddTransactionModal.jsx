import React, { useState, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import Modal from './Modal';

const AddTransactionModal = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState({});
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const { addTransaction, setAlert } = useContext(GlobalContext);

  const defaultCategories = ['Food', 'Transportation', 'Healthcare', 'Entertainment', 'Housing', 'Utilities', 'Stationary', 'Other'];
  const allCategories = [...defaultCategories, ...customCategories];
  const categoryEmojis = {
    'Food': '🍔',
    'Transportation': '🚗',
    'Healthcare': '🏥',
    'Entertainment': '🎬',
    'Housing': '🏠',
    'Utilities': '💡',
    'Stationary': '📝',
    'Other': '📦'
  };

  const handleAddCustomCategory = () => {
    const trimmedCategory = newCategory.trim();
    if (trimmedCategory && !allCategories.includes(trimmedCategory)) {
      setCustomCategories([...customCategories, trimmedCategory]);
      setCategory(trimmedCategory);
      setNewCategory('');
      setShowCustomInput(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!title.trim()) newErrors.title = 'Description is required';
    if (title.trim().length > 100) newErrors.title = 'Description must be under 100 characters';
    if (!amount || amount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (isNaN(Date.parse(date))) newErrors.date = 'Invalid date';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const newTransaction = {
      text: title.trim(),
      amount: type === 'expense' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
      category,
    };
    
    try {
      await addTransaction(newTransaction);
      setAlert(`${type === 'expense' ? 'Expense' : 'Income'} added successfully!`, 'success');
      
      // Reset form
      setTitle('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Food');
      setType('expense');
      setErrors({});
      onClose();
    } catch (err) {
      setAlert('Failed to add transaction', 'danger');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add ${type === 'expense' ? 'Expense' : 'Income'}`}>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        {/* Type Toggle */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          padding: '8px',
          background: 'var(--bg-app)',
          borderRadius: '10px'
        }}>
          <button
            type="button"
            onClick={() => setType('expense')}
            style={{
              flex: 1,
              padding: '12px',
              background: type === 'expense' ? '#ef4444' : 'transparent',
              color: type === 'expense' ? 'white' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            💸 Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            style={{
              flex: 1,
              padding: '12px',
              background: type === 'income' ? '#10b981' : 'transparent',
              color: type === 'income' ? 'white' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            💰 Income
          </button>
        </div>

        {/* Description Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Description
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'expense' ? 'e.g. Lunch at Cafe' : 'e.g. Freelance Work'}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              border: `2px solid ${errors.title ? '#ef4444' : 'var(--border-subtle)'}`,
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = errors.title ? '#ef4444' : 'var(--border-subtle)'}
          />
          {errors.title && <span style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>⚠️ {errors.title}</span>}
        </div>

        {/* Amount Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Amount (Rs)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              border: `2px solid ${errors.amount ? '#ef4444' : 'var(--border-subtle)'}`,
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '1.1rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = errors.amount ? '#ef4444' : 'var(--border-subtle)'}
          />
          {errors.amount && <span style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>⚠️ {errors.amount}</span>}
        </div>

        {/* Category Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Category
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {/* Custom Dropdown */}
            <div style={{ flex: 1, position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
              >
                <span>{categoryEmojis[category] || '📌'} {category}</span>
                <span style={{ fontSize: '0.8rem' }}>▼</span>
              </button>

              {/* Dropdown List */}
              {showCategoryDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-card)',
                    border: '2px solid #667eea',
                    borderRadius: '10px',
                    marginTop: '4px',
                    zIndex: 1001,
                    maxHeight: '250px',
                    overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.2)'
                  }}
                >
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setShowCategoryDropdown(false);
                        setShowCustomInput(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: category === cat ? '#667eea' : 'transparent',
                        color: category === cat ? 'white' : 'var(--text-primary)',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '1rem',
                        fontWeight: category === cat ? '600' : '500',
                        borderBottom: '1px solid var(--border-subtle)'
                      }}
                      onMouseEnter={(e) => {
                        if (category !== cat) {
                          e.target.style.background = 'var(--bg-app)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (category !== cat) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      {categoryEmojis[cat] || '📌'} {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '2px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                color: 'var(--text-muted)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#667eea';
                e.target.style.color = 'white';
                e.target.style.borderColor = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--bg-app)';
                e.target.style.color = 'var(--text-muted)';
                e.target.style.borderColor = 'var(--border-subtle)';
              }}
            >
              ➕
            </button>
          </div>

          {/* Custom Category Input */}
          {showCustomInput && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomCategory();
                  }
                }}
                placeholder="Enter new category..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid #667eea',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCustomCategory}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#10b981',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Date Field */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              border: `2px solid ${errors.date ? '#ef4444' : 'var(--border-subtle)'}`,
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
              cursor: 'pointer'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = errors.date ? '#ef4444' : 'var(--border-subtle)'}
          />
          {errors.date && <span style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>⚠️ {errors.date}</span>}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '28px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: 'var(--bg-app)',
              color: 'var(--text-muted)',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '1rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--border-subtle)';
              e.target.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--bg-app)';
              e.target.style.color = 'var(--text-muted)';
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: '12px 20px',
              background: type === 'expense' ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '1rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {type === 'expense' ? '💸 Add Expense' : '💰 Add Income'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTransactionModal;
