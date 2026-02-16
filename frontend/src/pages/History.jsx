import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import './DashboardUI.css';

const History = () => {
  const {
    error,
    historyItems,
    historyPagination,
    historyLoading,
    categories,
    expenses,
    getData,
    getExpenseHistory
  } = useGlobalContext();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    await getExpenseHistory({
      page,
      limit: 8,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      category: category !== 'All' ? category : undefined
    });
  }, [category, endDate, getExpenseHistory, page, startDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    getData();
  }, [getData]);

  const monthlyLimit = useMemo(
    () => categories.reduce((sum, item) => sum + Number(item.budget || 0), 0),
    [categories]
  );

  const thisMonthSpent = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((item) => {
        if ((item.type || 'expense') !== 'expense') return false;
        const date = new Date(item.date);
        if (Number.isNaN(date.getTime())) return false;
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  const limitPercent = monthlyLimit > 0 ? Math.min((thisMonthSpent / monthlyLimit) * 100, 100) : 0;

  const chartData = useMemo(() => {
    const now = new Date();
    const totalsByDay = new Map();
    expenses.forEach((item) => {
      if ((item.type || 'expense') !== 'expense') return;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return;
      const day = date.getDate();
      totalsByDay.set(day, (totalsByDay.get(day) || 0) + Number(item.amount || 0));
    });
    return Array.from(totalsByDay.keys()).sort((a, b) => a - b).map((day) => ({
      day,
      amount: totalsByDay.get(day)
    }));
  }, [expenses]);

  const rightPanel = (
    <>
      <div className="ui-card">
        <h3>Spending Limits</h3>
        <p className="muted" style={{ margin: '4px 0 8px' }}>Monthly transaction limit</p>
        <strong style={{ fontSize: '1.7rem' }}>Rs.{Math.round(monthlyLimit).toLocaleString()}</strong>
        <p className="muted" style={{ margin: '8px 0 4px' }}>{limitPercent.toFixed(1)}%</p>
        <div className="budget-meter">
          <span style={{ width: `${limitPercent}%` }} />
        </div>
      </div>

      <div className="ui-card">
        <h3>Expense this month</h3>
        <div style={{ width: '100%', height: '210px' }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );

  return (
    <AppShell
      title="Transaction"
      subtitle="Filter, review, and monitor your spending stream"
      rightPanel={rightPanel}
    >
      {historyLoading ? <div className="inline-loading">Loading transactions...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="ui-card">
        <div className="form-grid cols-4" style={{ marginBottom: '10px' }}>
          <div className="form-field">
            <label>Start date</label>
            <input type="date" value={startDate} onChange={(e) => { setPage(1); setStartDate(e.target.value); }} />
          </div>
          <div className="form-field">
            <label>End date</label>
            <input type="date" value={endDate} onChange={(e) => { setPage(1); setEndDate(e.target.value); }} />
          </div>
          <div className="form-field">
            <label>Category</label>
            <select value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }}>
              <option value="All">All</option>
              {categories.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => { setPage(1); setStartDate(''); setEndDate(''); setCategory('All'); }}>Clear filter</button>
          </div>
        </div>

        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Category</th>
              <th>Date</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {historyItems.map((item) => (
              <tr key={item._id}>
                <td>{item.title}</td>
                <td>{item.category}</td>
                <td>{new Date(item.date).toLocaleString()}</td>
                <td style={{ color: (item.type || 'expense') === 'income' ? '#166534' : '#b91c1c' }}>
                  {(item.type || 'expense') === 'income' ? '+' : '-'}Rs {Number(item.amount || 0).toLocaleString()}
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

export default History;
