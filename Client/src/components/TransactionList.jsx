import React, { useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';
import Transaction from './Transaction';

const TransactionList = ({ isDashboard = false }) => {
  const { transactions, getTransactions } = useContext(GlobalContext);

  useEffect(() => {
    getTransactions();
  }, [getTransactions]);

  const displayTransactions = isDashboard ? transactions.slice(0, 5) : transactions;

  return (
    <div className="activity-feed-wrapper">
      <div className="section-header">
        <h3 className="card-label">Recent Activity</h3>
        {!isDashboard && <span className="text-muted text-sm">{transactions.length} total</span>}
      </div>
      
      {displayTransactions.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted">No transactions found. Add your first expense!</p>
        </div>
      ) : (
        <ul className="history-list">
          {displayTransactions.map(transaction => (
            <Transaction key={transaction._id} transaction={transaction} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default TransactionList;