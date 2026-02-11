import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Transactions = () => {
  const { transactions, getTransactions, deleteTransaction, bulkDelete, loading } = useContext(GlobalContext);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const itemsPerPage = 10;

  useEffect(() => {
    getTransactions();
    // eslint-disable-next-line
  }, []);

  // Filter & Search Logic
  let filtered = transactions.filter(t => 
    (category === 'All' || t.category === category) &&
    (t.text.toLowerCase().includes(search.toLowerCase()))
  );

  // Sorting Logic
  filtered.sort((a, b) => {
    if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'amount-high') return b.amount - a.amount;
    if (sort === 'amount-low') return a.amount - b.amount;
    return 0;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (loading) return <div className="loader">Loading Command Center...</div>;

  return (
    <div className="transactions-page">
      <div className="filter-bar-advanced">
        <input 
          type="text" 
          placeholder="Search by description..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="filter-group">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {/* ... other options */}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Amount (High-Low)</option>
            <option value="amount-low">Amount (Low-High)</option>
          </select>
        </div>
      </div>

      <div className="table-actions">
        {selected.length > 0 && (
          <button className="btn-danger" onClick={() => { bulkDelete(selected); setSelected([]); }}>
            Delete Selected ({selected.length})
          </button>
        )}
      </div>

      <div className="card table-container">
        <table className="transaction-table">
          <thead>
            <tr>
              <th><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? filtered.map(t => t._id) : [])} /></th>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map(t => (
              <tr key={t._id}>
                <td><input type="checkbox" checked={selected.includes(t._id)} onChange={() => toggleSelect(t._id)} /></td>
                <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                <td>{t.text}</td>
                <td><span className={`badge ${t.category.toLowerCase()}`}>{t.category}</span></td>
                <td className={t.amount < 0 ? 'text-danger' : 'text-success'}>
                  {t.amount < 0 ? '-' : '+'} Rs {Math.abs(t.amount)}
                </td>
                <td>
                  <button className="btn-icon" onClick={() => deleteTransaction(t._id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default Transactions;