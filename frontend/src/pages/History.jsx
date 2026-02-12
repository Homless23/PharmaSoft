import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiBarChart2, FiClock, FiHome } from 'react-icons/fi';
import AddTransactionModal from '../components/AddTransactionModal';
import Spinner from '../components/Spinner';
import { useGlobalContext } from '../context/globalContext';
import { getCategoryIcon } from '../utils/categoryIcons';
import { exportExpensesToCSV, exportExpensesToPDF } from '../utils/export';
import './Home.css';

const History = () => {
  const {
    error,
    setError,
    categories,
    historyItems,
    historyPagination,
    historyLoading,
    getExpenseHistory,
    updateExpense,
    deleteExpense,
    generateRecurringExpense
  } = useGlobalContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [type, setType] = useState('all');
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const categoryOptions = useMemo(() => {
    const names = categories.map((c) => c.name);
    return names.length ? names : ['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Other'];
  }, [categories]);

  const fetchHistory = useCallback(async () => {
    await getExpenseHistory({
      page,
      limit,
      search: search || undefined,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      type: type !== 'all' ? type : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      recurringOnly: recurringOnly ? 'true' : undefined
    });
  }, [getExpenseHistory, page, limit, search, selectedCategory, type, startDate, endDate, recurringOnly]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const openEditModal = (item) => {
    setEditingExpense(item);
    setEditForm({
      title: item.title || '',
      amount: String(item.amount || ''),
      type: item.type || 'expense',
      category: item.category || 'Other',
      description: item.description || '',
      date: new Date(item.date).toISOString().split('T')[0],
      recurringEnabled: Boolean(item.recurring?.enabled),
      recurringFrequency: item.recurring?.frequency || 'monthly'
    });
  };

  const onSaveEdit = async () => {
    if (!editingExpense || !editForm) return;
    const amount = Number(editForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const success = await updateExpense(editingExpense._id, {
      title: editForm.title.trim(),
      amount,
      type: editForm.type,
      category: editForm.category,
      description: editForm.description.trim(),
      date: editForm.date,
      recurring: {
        enabled: editForm.recurringEnabled,
        frequency: editForm.recurringFrequency
      }
    });
    if (!success) return;
    setEditingExpense(null);
    setEditForm(null);
    await fetchHistory();
  };

  const onDelete = async (id) => {
    const success = await deleteExpense(id);
    if (success) await fetchHistory();
  };

  const onGenerate = async (id) => {
    const result = await generateRecurringExpense(id);
    if (result.success) await fetchHistory();
  };

  return (
    <div className="home-container">
      <header className="top-nav glass">
        <div>
          <p className="eyebrow">Expense OS</p>
          <h1>History</h1>
        </div>
        <div className="nav-actions">
          <button className="primary-btn" onClick={() => setIsModalOpen(true)}>+ Add Transaction</button>
          <NavLink to="/" end className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <FiHome /> Dashboard
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <FiClock /> History
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <FiBarChart2 /> Analytics
          </NavLink>
        </div>
      </header>

      {error && <div className="alert-error">{error}</div>}

      <section className="glass panel history-panel">
        <div className="history-header">
          <h3>Transaction History</h3>
          <div className="history-filters">
            <input className="input compact" placeholder="Search..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); if (error) setError(null); }} />
            <select className="input compact" value={selectedCategory} onChange={(e) => { setPage(1); setSelectedCategory(e.target.value); }}>
              <option value="All">All Categories</option>
              {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select className="input compact" value={type} onChange={(e) => { setPage(1); setType(e.target.value); }}>
              <option value="all">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input className="input compact" type="date" value={startDate} onChange={(e) => { setPage(1); setStartDate(e.target.value); }} />
            <input className="input compact" type="date" value={endDate} onChange={(e) => { setPage(1); setEndDate(e.target.value); }} />
            <label className="check-wrap compact-check">
              <input type="checkbox" checked={recurringOnly} onChange={(e) => { setPage(1); setRecurringOnly(e.target.checked); }} />
              <span>Recurring only</span>
            </label>
          </div>
        </div>

        <div className="export-bar">
          <button className="ghost-btn" onClick={() => exportExpensesToCSV(historyItems, 'history.csv')}>Export CSV</button>
          <button className="ghost-btn" onClick={() => exportExpensesToPDF(historyItems, 'history.pdf')}>Export PDF</button>
        </div>

        {historyLoading ? (
          <Spinner />
        ) : historyItems.length ? (
          <div className="group-list">
            {historyItems.map((item) => (
              <div key={item._id} className="transaction-item">
                <div className="t-left">
                  <div className="t-icon">{getCategoryIcon(item.category, item.type)}</div>
                  <div className="t-details">
                    <span className="t-title">{item.title}</span>
                    <span className="t-meta">
                      {(item.type || 'expense').toUpperCase()} | {item.category} | {new Date(item.date).toLocaleDateString()}
                      {item.recurring?.enabled ? ` | Recurs: ${item.recurring.frequency}` : ''}
                    </span>
                  </div>
                </div>
                <div className="t-right">
                  <span className={item.type === 'income' ? 'text-success t-amount' : 'text-danger t-amount'}>
                    {item.type === 'income' ? '+' : '-'} Rs {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <button className="ghost-btn action-btn" onClick={() => openEditModal(item)}>Edit</button>
                  {item.recurring?.enabled && (
                    <button className="ghost-btn action-btn" onClick={() => onGenerate(item._id)}>Next</button>
                  )}
                  <button className="btn-delete" onClick={() => onDelete(item._id)}>x</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No transactions found.</div>
        )}

        <div className="pagination-row">
          <button className="ghost-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span>Page {historyPagination.page} of {historyPagination.totalPages}</span>
          <button className="ghost-btn" disabled={page >= historyPagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          <select className="input compact" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </section>

      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchHistory} />

      {editingExpense && editForm && (
        <div className="wizard-overlay">
          <div className="wizard-card">
            <h3>Edit Transaction</h3>
            <div className="stacked-form">
              <div className="row">
                <select className="input" value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <input className="input" type="number" min="0.01" step="0.01" value={editForm.amount} onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <input className="input" value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
              <div className="row">
                <select className="input" value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}>
                  {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <input className="input" type="date" value={editForm.date} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <input className="input" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
              {editForm.type === 'expense' && (
                <div className="row">
                  <label className="check-wrap">
                    <input type="checkbox" checked={editForm.recurringEnabled} onChange={(e) => setEditForm((p) => ({ ...p, recurringEnabled: e.target.checked }))} />
                    <span>Recurring</span>
                  </label>
                  <select className="input" disabled={!editForm.recurringEnabled} value={editForm.recurringFrequency} onChange={(e) => setEditForm((p) => ({ ...p, recurringFrequency: e.target.value }))}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
              <div className="row">
                <button className="primary-btn" onClick={onSaveEdit}>Save</button>
                <button className="ghost-btn" onClick={() => { setEditingExpense(null); setEditForm(null); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
