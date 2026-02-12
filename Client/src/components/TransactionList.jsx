import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { SkeletonBase } from './Skeleton';
import Pagination from './Pagination';

const TransactionList = ({ title }) => {
  const { transactions, deleteTransaction, loading, getTransactionsByPage, pagination } = useContext(GlobalContext);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = pagination.limit || 10;

  // Load transactions for the first page on component mount
  useEffect(() => {
    getTransactionsByPage(1, itemsPerPage);
  }, [itemsPerPage]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    getTransactionsByPage(newPage, itemsPerPage);
    // Scroll to top of transaction list
    const element = document.querySelector('.transaction-list-raw');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Reset to first page when adding a transaction
  useEffect(() => {
    if (!loading && currentPage !== 1 && transactions.length > 0) {
      // If we're not on page 1 and data changed, optionally stay on current page
      // or reset to page 1 after deletion
    }
  }, [transactions.length]);

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
      {transactions.length === 0 ? (
        <div className="no-transactions" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          No transactions found
        </div>
      ) : (
        <>
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
          {pagination.pages && pagination.pages > 1 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.pages}
              total={pagination.total}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
};

export default TransactionList;