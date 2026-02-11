import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { SkeletonBase } from './Skeleton';

const TransactionList = ({ title }) => {
  const { transactions, deleteTransaction, loading } = useContext(GlobalContext);

  if (loading) {
    return (
      <div className="card">
        <h3 className="card-label">{title}</h3>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="transaction-item-skeleton">
            <SkeletonBase width="40px" height="40px" borderRadius="10px" />
            <div style={{ flex: 1, marginLeft: '15px' }}>
              <SkeletonBase width="50%" height="12px" className="mb-5" />
              <SkeletonBase width="30%" height="10px" />
            </div>
            <SkeletonBase width="60px" height="20px" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-label">{title}</h3>
      <ul className="transaction-list-raw">
        {transactions.map(t => (
          <li key={t._id} className="transaction-item">
            <div className="t-info">
              <span className="t-text">{t.text}</span>
              <span className="t-date">{new Date(t.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="t-amount-group">
              <span className={t.amount < 0 ? 'text-danger' : 'text-success'}>
                {t.amount < 0 ? '-' : '+'}Rs {Math.abs(t.amount)}
              </span>
              <button onClick={() => deleteTransaction(t._id)} className="btn-delete-tiny">×</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TransactionList;