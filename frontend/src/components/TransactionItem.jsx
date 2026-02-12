import React from 'react';
import { getCategoryIcon } from '../utils/categoryIcons';

const TransactionItem = ({ item, currencySymbol, onDelete }) => {
  const amount = Number(item.amount);
  const parsedDate = new Date(item.date);
  const displayDate = Number.isNaN(parsedDate.getTime())
    ? 'Unknown date'
    : parsedDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });

  return (
    <div className="transaction-item">
      <div className="t-left">
        <div className="t-icon">{getCategoryIcon(item.category, item.type)}</div>
        <div className="t-details">
          <span className="t-title">{item.title}</span>
          <span className="t-meta">{item.category} | {displayDate}</span>
        </div>
      </div>

      <div className="t-right">
        <span className="t-amount">
          - {currencySymbol}
          {Number.isFinite(amount)
            ? amount.toLocaleString(undefined, { minimumFractionDigits: 2 })
            : '0.00'}
        </span>
        <button
          className="btn-delete"
          onClick={() => onDelete(item._id)}
          aria-label="Delete transaction"
        >
          x
        </button>
      </div>
    </div>
  );
};

export default TransactionItem;
