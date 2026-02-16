import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import './DashboardUI.css';

const emptyForm = {
  amount: '',
  title: '',
  description: '',
  category: '',
  date: new Date().toISOString().split('T')[0]
};

const AddTransaction = () => {
  const {
    error,
    categories,
    historyItems,
    historyPagination,
    historyLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    getData,
    getExpenseHistory
  } = useGlobalContext();

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);

  const activeCategories = categories.filter((item) => item.active !== false);

  const fetchRows = useCallback(async () => {
    await getExpenseHistory({ page, limit: 10, type: 'expense' });
  }, [getExpenseHistory, page]);

  useEffect(() => {
    getData();
  }, [getData]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (!form.category && activeCategories.length) {
      setForm((prev) => ({ ...prev, category: activeCategories[0].name }));
    }
  }, [activeCategories, form.category]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      title: form.title.trim(),
      amount: Number(form.amount),
      description: form.description.trim(),
      category: form.category,
      date: form.date
    };
    if (!payload.title || !payload.description || !payload.category || payload.amount <= 0) return;

    let success = false;
    if (editingId) {
      success = await updateExpense(editingId, payload);
    } else {
      success = await addExpense(payload);
    }
    if (!success) return;

    setEditingId(null);
    setForm((prev) => ({ ...emptyForm, category: prev.category || '' }));
    await fetchRows();
  };

  const onEdit = (item) => {
    setEditingId(item._id);
    setForm({
      amount: String(item.amount || ''),
      title: item.title || '',
      description: item.description || '',
      category: item.category || '',
      date: new Date(item.date).toISOString().slice(0, 10)
    });
  };

  const onDelete = async (id) => {
    const success = await deleteExpense(id);
    if (!success) return;
    await fetchRows();
  };

  return (
    <AppShell
      title="Create Expense Entry"
      subtitle="Add, edit, and manage your expense rows dynamically"
    >
      {historyLoading ? <div className="inline-loading">Loading expense entries...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="ui-card" style={{ marginBottom: '12px' }}>
        <form onSubmit={onSubmit}>
          <div className="form-grid cols-4">
            <div className="form-field">
              <label>Expense</label>
              <input
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Description</label>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                {activeCategories.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-field" style={{ marginTop: '10px' }}>
            <label>Details</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div style={{ marginTop: '10px' }}>
            <button className="btn-primary" type="submit">
              {editingId ? 'Update Entry' : 'Create'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ marginLeft: '8px' }}
                onClick={() => {
                  setEditingId(null);
                  setForm((prev) => ({ ...emptyForm, category: prev.category || '' }));
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="ui-card">
        <h3 style={{ marginBottom: '8px' }}>Expense Entries</h3>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Expense</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {historyItems.map((item) => (
              <tr key={item._id}>
                <td>{item.title}</td>
                <td>{item.category}</td>
                <td>Rs.{Number(item.amount || 0).toLocaleString()}</td>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td>
                  <div className="inline-actions">
                    <button className="btn-secondary" onClick={() => onEdit(item)}>Edit</button>
                    <button className="btn-danger" onClick={() => onDelete(item._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination-bar">
          <button className="btn-secondary" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>Prev</button>
          <span className="muted">Page {historyPagination.page} of {historyPagination.totalPages}</span>
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.min(p + 1, historyPagination.totalPages))}
            disabled={page >= historyPagination.totalPages}
          >
            Next
          </button>
        </div>
      </section>
    </AppShell>
  );
};

export default AddTransaction;
