import React, { useState, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';

const TransactionFilters = () => {
  const { getTransactions } = useContext(GlobalContext);
  const [query, setQuery] = useState({ search: '', category: 'All', type: 'all' });

  const handleChange = (e) => {
    const newQuery = { ...query, [e.target.name]: e.target.value };
    setQuery(newQuery);
    
    // Construct query string for backend
    const params = new URLSearchParams();
    if (newQuery.search) params.append('search', newQuery.search);
    if (newQuery.category !== 'All') params.append('category', newQuery.category);
    if (newQuery.type !== 'all') params.append('type', newQuery.type);
    
    getTransactions(params.toString());
  };

  return (
    <div className="filter-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input 
          type="text" 
          name="search"
          placeholder="Search by description..." 
          value={query.search}
          onChange={handleChange}
          className="search-input"
        />
      </div>

      <div className="filter-group">
        <select name="type" value={query.type} onChange={handleChange} className="filter-select">
          <option value="all">All Types</option>
          <option value="income">Income Only</option>
          <option value="expense">Expenses Only</option>
        </select>

        <select name="category" value={query.category} onChange={handleChange} className="filter-select">
          <option value="All">All Categories</option>
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
  );
};

export default TransactionFilters;