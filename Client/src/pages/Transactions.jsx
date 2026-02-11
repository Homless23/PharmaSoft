import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';
import Pagination from '../components/Pagination';

const Transactions = () => {
  const { transactions, getTransactionsByPage, deleteTransaction, loading, pagination } = useContext(GlobalContext);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = pagination.limit || 10;

  useEffect(() => {
    getTransactionsByPage(1, itemsPerPage);
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

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    getTransactionsByPage(newPage, itemsPerPage);
  };

  const categoryIcons = {
    'Food': '🍔', 'Transportation': '🚗', 'Healthcare': '🏥', 
    'Entertainment': '🎬', 'Housing': '🏠', 'Utilities': '💡', 
    'Stationary': '📝', 'Other': '📦'
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Loading transactions...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '40px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: '800', 
          margin: '0 0 8px 0',
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px'
        }}>
          All Transactions 💳
        </h1>
        <p style={{ 
          fontSize: '1rem',
          color: 'var(--text-muted)',
          margin: 0
        }}>
          Manage and organize your transactions
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '30px'
      }}>
        {/* Search */}
        <div>
          <input 
            type="text" 
            placeholder="Search transactions..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>

        {/* Category Filter */}
        <div>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
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

        {/* Sorting */}
        <div>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Highest Amount</option>
            <option value="amount-low">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        {transactions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
            <p style={{ fontSize: '1.05rem' }}>No transactions yet</p>
            <p style={{ fontSize: '0.9rem' }}>Add your first transaction to see it here</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div style={{ overflowX: 'auto', display: 'none' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t._id} style={{ borderTop: '1px solid var(--border-subtle)', transition: 'background 0.2s ease' }}>
                      <td style={{ padding: '16px' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>{t.text}</td>
                      <td style={{ padding: '16px' }}><span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        background: 'var(--bg-app)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: 'var(--text-muted)'
                      }}>{categoryIcons[t.category] || '📦'} {t.category}</span></td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: t.amount < 0 ? '#ef4444' : '#10b981' }}>
                        {t.amount < 0 ? '-' : '+'} Rs {Math.abs(t.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button 
                          onClick={() => deleteTransaction(t._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            opacity: 0.7,
                            transition: 'opacity 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = '1'}
                          onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div style={{ padding: '20px' }}>
              {filtered.map(t => (
                <div 
                  key={t._id}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-app)',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {t.text}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{categoryIcons[t.category] || '📦'} {t.category}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontWeight: '700', color: t.amount < 0 ? '#ef4444' : '#10b981', textAlign: 'right', minWidth: '80px' }}>
                      {t.amount < 0 ? '-' : '+'} Rs {Math.abs(t.amount).toFixed(2)}
                    </div>
                    <button 
                      onClick={() => deleteTransaction(t._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        opacity: 0.7,
                        transition: 'opacity 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '1'}
                      onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
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
    </div>
  );
};

export default Transactions;