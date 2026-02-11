import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Transaction = ({ transaction }) => {
  const { deleteTransaction } = useContext(GlobalContext);

  // Fintech Icon Mapping
  const getIcon = (category) => {
    const icons = {
      Food: '🍔',
      Transportation: '🚗',
      Healthcare: '🏥',
      Entertainment: '🎬',
      Housing: '🏠',
      Utilities: '⚡',
      Stationary: '✏️',
      Other: '📦'
    };
    return icons[category] || '💰';
  };

  const sign = transaction.amount < 0 ? '-' : '+';
  const colorClass = transaction.amount < 0 ? 'text-danger' : 'text-success';

  return (
    <li className="activity-row">
      <div className="activity-left">
        <div className="activity-icon-wrapper">
          {getIcon(transaction.category)}
        </div>
        <div className="activity-details">
          <span className="activity-text">{transaction.text}</span>
          <span className="activity-meta">
            {new Date(transaction.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {transaction.category}
          </span>
        </div>
      </div>
      
      <div className="activity-right">
        <span className={`activity-amount ${colorClass}`}>
          {sign}Rs {Math.abs(transaction.amount).toLocaleString()}
        </span>
        <button 
          className="row-delete-btn"
          onClick={() => deleteTransaction(transaction._id)}
          title="Delete Transaction"
        >
          &times;
        </button>
      </div>
    </li>
  );
};

export default Transaction;