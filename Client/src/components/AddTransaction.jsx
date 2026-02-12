import React, { useState, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';

const AddTransaction = ({ onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState({});

  const { addTransaction } = useContext(GlobalContext);

  const validateForm = () => {
    const newErrors = {};
    
    if (!title.trim()) newErrors.title = 'Title is required';
    if (title.trim().length > 100) newErrors.title = 'Title must be under 100 characters';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!amount || amount <= 0) newErrors.amount = 'Amount must be positive';
    if (isNaN(Date.parse(date))) newErrors.date = 'Invalid date';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const newTransaction = {
      title: title.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      date,
      type
    };
    
    addTransaction(newTransaction);
    onSuccess();
    
    // Reset form
    setTitle('');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Food');
    setErrors({});
  };

  return (
    <form onSubmit={onSubmit} className="premium-form">
      <div className="type-toggle">
        <button 
          type="button" 
          className={type === 'expense' ? 'toggle-btn active red' : 'toggle-btn'}
          onClick={() => setType('expense')}
        >
          Expense
        </button>
        <button 
          type="button" 
          className={type === 'income' ? 'toggle-btn active green' : 'toggle-btn'}
          onClick={() => setType('income')}
        >
          Income
        </button>
      </div>

      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Starbucks Coffee"
          className={errors.title ? 'input-error' : ''}
        />
        {errors.title && <span className="error-text">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details about this transaction"
          className={errors.description ? 'input-error' : ''}
        />
        {errors.description && <span className="error-text">{errors.description}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            className={errors.amount ? 'input-error' : ''}
          />
          {errors.amount && <span className="error-text">{errors.amount}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={errors.date ? 'input-error' : ''}
          />
          {errors.date && <span className="error-text">{errors.date}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Food">Food</option>
            <option value="Transportation">Transportation</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Housing">Housing</option>
            <option value="Utilities">Utilities</option>
            <option value="Stationary">Stationary</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <button type="submit" className="btn-primary main-submit">Confirm Transaction</button>
    </form>
  );
};

export default AddTransaction;