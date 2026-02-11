import React from 'react';
import { getCategoryIcon } from '../utils/categoryIcons';

const TransactionItem = ({ item, currencySymbol, onDelete }) => {
  const displayDate = new Date(item.date).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric'
  });

  return (
    <div className="transaction-item">
      <div className="t-left">
        <div className="t-icon">
          {getCategoryIcon(item.category)}
        </div>
        <div className="t-details">
          <span className="t-title">{item.title}</span>
          <span className="t-meta">{item.category} • {displayDate}</span>
        </div>
      </div>
      
      <div className="t-right">
        <span className="t-amount">
          - {currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        <button 
          className="btn-delete" 
          onClick={() => onDelete(item._id)}
          aria-label="Delete transaction"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default TransactionItem;