import React from 'react';
import TransactionList from '../components/TransactionList';
import TransactionFilters from '../components/TransactionFilters';

const History = () => {
  return (
    <div className="container">
      <div className="header-flex" style={{ marginBottom: '30px' }}>
        <h2>Full Transaction History</h2>
        {/* Placeholder for export functionality later */}
        <button className="btn-secondary">
          <i className="fas fa-download"></i> Export CSV
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <TransactionFilters />
      </div>

      {/* The Full List */}
      <div className="card" style={{ minHeight: '500px' }}>
        <TransactionList />
      </div>
    </div>
  );
};

export default History;