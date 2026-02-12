import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BudgetSection from '../components/BudgetSection';
import CategoryPieChart from '../components/CategoryPieChart';
import ExpenseChart from '../components/ExpenseChart';
import Spinner from '../components/Spinner';
import { useGlobalContext } from '../context/globalContext';
import { useGroupedExpenses } from '../hooks/useGroupedExpenses';
import { getCategoryIcon } from '../utils/categoryIcons';
import { exportExpensesToCSV, exportExpensesToPDF } from '../utils/export';
import './Home.css';

const NEW_EXPENSE_STATE = {
  title: '',
  amount: '',
  category: 'Food',
  description: '',
  date: new Date().toISOString().split('T')[0],
  recurringEnabled: false,
  recurringFrequency: 'monthly'
};

const Home = () => {
  const {
    user,
    loading,
    error,
    setError,
    expenses,
    historyItems,
    historyLoading,
    historyPagination,
    categories,
    getData,
    getExpenseHistory,
    addExpense,
    updateExpense,
    addCategory,
    deleteExpense,
    generateRecurringExpense,
    logoutUser
  } = useGlobalContext();

  const [form, setForm] = useState(NEW_EXPENSE_STATE);
  const [newCategory, setNewCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm, setEditForm] = useState(null);

  useEffect(() => {
    getData();
  }, [getData]);

  useEffect(() => {
    getExpenseHistory({
      page,
      limit,
      search: search || undefined,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      recurringOnly: recurringOnly ? 'true' : undefined
    });
  }, [page, limit, search, selectedCategory, startDate, endDate, recurringOnly, getExpenseHistory]);

  const { financials, groupedData } = useGroupedExpenses(historyItems, categories);

  const categoryOptions = useMemo(() => {
    if (!categories.length) return ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Other'];
    return categories.map((c) => c.name);
  }, [categories]);

  const monthlyTarget = categories.reduce((acc, item) => acc + Number(item.budget || 0), 0);
  const totalLifetimeSpend = expenses.reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const onSubmitExpense = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    setIsSubmitting(true);
    const success = await addExpense({
      title: form.title.trim(),
      amount,
      category: form.category,
      description: form.description.trim(),
      date: form.date,
      recurring: {
        enabled: form.recurringEnabled,
        frequency: form.recurringFrequency
      }
    });
    setIsSubmitting(false);

    if (!success) return;
    setForm({ ...NEW_EXPENSE_STATE, category: form.category });
    await getExpenseHistory({ page, limit, search, category: selectedCategory, startDate, endDate, recurringOnly: recurringOnly ? 'true' : undefined });
  };

  const onAddCategory = async () => {
    if (!newCategory.trim()) return;
    const success = await addCategory(newCategory.trim(), 0);
    if (success) setNewCategory('');
  };

  const openEditModal = (item) => {
    setEditingExpense(item);
    setEditForm({
      title: item.title || '',
      amount: String(item.amount || ''),
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
    await getExpenseHistory({ page, limit, search, category: selectedCategory, startDate, endDate, recurringOnly: recurringOnly ? 'true' : undefined });
  };

  const onDeleteExpense = async (id) => {
    const success = await deleteExpense(id);
    if (success) {
      await getExpenseHistory({ page, limit, search, category: selectedCategory, startDate, endDate, recurringOnly: recurringOnly ? 'true' : undefined });
    }
  };

  const onGenerateRecurring = async (id) => {
    const result = await generateRecurringExpense(id);
    if (result.success) {
      await getExpenseHistory({ page, limit, search, category: selectedCategory, startDate, endDate, recurringOnly: recurringOnly ? 'true' : undefined });
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="home-container">
      <header className="top-nav glass">
        <div>
          <p className="eyebrow">Expense OS</p>
          <h1>Welcome back, {user?.name || 'User'}</h1>
        </div>
        <div className="nav-actions">
          <Link to="/analytics" className="ghost-btn">Analytics View</Link>
          <button className="danger-btn" onClick={logoutUser}>Logout</button>
        </div>
      </header>

      {error && <div className="alert-error">{error}</div>}

      <section className="stats-grid">
        <article className="glass stat-card"><p>Spent This Page</p><h2>Rs {financials.totalSpent.toLocaleString()}</h2></article>
        <article className="glass stat-card"><p>Monthly Budget</p><h2>Rs {monthlyTarget.toLocaleString()}</h2></article>
        <article className="glass stat-card">
          <p>Remaining Budget</p>
          <h2 className={financials.remaining < 0 ? 'text-danger' : 'text-success'}>Rs {financials.remaining.toLocaleString()}</h2>
        </article>
        <article className="glass stat-card"><p>All-Time Spend</p><h2>Rs {totalLifetimeSpend.toLocaleString()}</h2></article>
      </section>

      <section className="main-grid">
        <article className="glass panel">
          <h3>Add Expense</h3>
          <form className="stacked-form" onSubmit={onSubmitExpense}>
            <input className="input" placeholder="Title" value={form.title} required onChange={(e) => { if (error) setError(null); setForm((p) => ({ ...p, title: e.target.value })); }} />
            <div className="row">
              <input className="input" type="number" min="0.01" step="0.01" placeholder="Amount" value={form.amount} required onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
              <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="row">
              <input className="input" type="date" value={form.date} required onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              <input className="input" placeholder="Description" value={form.description} required onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="row">
              <label className="check-wrap">
                <input
                  type="checkbox"
                  checked={form.recurringEnabled}
                  onChange={(e) => setForm((p) => ({ ...p, recurringEnabled: e.target.checked }))}
                />
                <span>Recurring Expense</span>
              </label>
              <select
                className="input"
                value={form.recurringFrequency}
                disabled={!form.recurringEnabled}
                onChange={(e) => setForm((p) => ({ ...p, recurringFrequency: e.target.value }))}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <button className="primary-btn" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Add Expense'}</button>
          </form>

          <div className="category-create">
            <h4>Category Management</h4>
            <div className="row">
              <input className="input" placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
              <button className="ghost-btn" onClick={onAddCategory}>Add Category</button>
            </div>
          </div>
        </article>
        <BudgetSection />
      </section>

      <section className="charts-grid">
        <ExpenseChart />
        <CategoryPieChart />
      </section>

      <section className="glass panel history-panel">
        <div className="history-header">
          <h3>Transaction History</h3>
          <div className="history-filters">
            <input className="input compact" placeholder="Search title..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
            <select className="input compact" value={selectedCategory} onChange={(e) => { setPage(1); setSelectedCategory(e.target.value); }}>
              <option value="All">All Categories</option>
              {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <input className="input compact" type="date" value={startDate} onChange={(e) => { setPage(1); setStartDate(e.target.value); }} />
            <input className="input compact" type="date" value={endDate} onChange={(e) => { setPage(1); setEndDate(e.target.value); }} />
            <label className="check-wrap compact-check">
              <input type="checkbox" checked={recurringOnly} onChange={(e) => { setPage(1); setRecurringOnly(e.target.checked); }} />
              <span>Recurring Only</span>
            </label>
          </div>
        </div>

        <div className="export-bar">
          <button className="ghost-btn" onClick={() => exportExpensesToCSV(historyItems, 'expense-history.csv')}>Export CSV</button>
          <button className="ghost-btn" onClick={() => exportExpensesToPDF(historyItems, 'expense-history.pdf')}>Export PDF</button>
        </div>

        {historyLoading ? (
          <Spinner />
        ) : groupedData.length ? (
          groupedData.map((group) => (
            <div key={group.title} className="transaction-group">
              <div className="group-header">
                <h5 className="group-title">{group.title}</h5>
                <span className="group-total">Rs {group.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="group-list">
                {group.items.map((item) => (
                  <div key={item._id} className="transaction-item">
                    <div className="t-left">
                      <div className="t-icon">{getCategoryIcon(item.category)}</div>
                      <div className="t-details">
                        <span className="t-title">{item.title}</span>
                        <span className="t-meta">
                          {item.category} | {new Date(item.date).toLocaleDateString()} {item.recurring?.enabled ? `| Recurs: ${item.recurring.frequency}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="t-right">
                      <span className="t-amount">Rs {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <button className="ghost-btn action-btn" onClick={() => openEditModal(item)}>Edit</button>
                      {item.recurring?.enabled && (
                        <button className="ghost-btn action-btn" onClick={() => onGenerateRecurring(item._id)}>Next</button>
                      )}
                      <button className="btn-delete" onClick={() => onDeleteExpense(item._id)}>x</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">No transactions match your filters.</div>
        )}

        <div className="pagination-row">
          <button className="ghost-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span>Page {historyPagination.page} of {historyPagination.totalPages}</span>
          <button className="ghost-btn" disabled={page >= historyPagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          <select className="input compact" value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </section>

      {editingExpense && editForm && (
        <div className="wizard-overlay">
          <div className="wizard-card">
            <h3>Edit Expense</h3>
            <div className="stacked-form">
              <input className="input" value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
              <div className="row">
                <input className="input" type="number" min="0.01" step="0.01" value={editForm.amount} onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} />
                <select className="input" value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}>
                  {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="row">
                <input className="input" type="date" value={editForm.date} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} />
                <input className="input" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
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

export default Home;
