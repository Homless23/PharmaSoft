import React, { useState, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';

const AddTransaction = ({ onSuccess }) => {
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food');

  const { addTransaction } = useContext(GlobalContext);

  const onSubmit = (e) => {
    e.preventDefault();
    const newTransaction = {
      text,
      amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      category
    };
    addTransaction(newTransaction);
    onSuccess(); // Close the modal
    setText('');
    setAmount('');
  };

  return (
    <form onSubmit={onSubmit} className="premium-form">
      <div className="type-toggle">
        <button 
          type="button" 
          className={type === 'expense' ? 'toggle-btn active red' : 'toggle-btn'}
          onClick={() => setType('expense')}
        >Expense</button>
        <button 
          type="button" 
          className={type === 'income' ? 'toggle-btn active green' : 'toggle-btn'}
          onClick={() => setType('income')}
        >Income</button>
      </div>

      <div className="form-group">
        <label>Description</label>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Starbucks Coffee" required />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Amount (Rs)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
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