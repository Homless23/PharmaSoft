import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import './DashboardUI.css';

const Reports = () => {
  const { loading, expenses, categories, getData } = useGlobalContext();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    getData();
  }, [getData]);

  const expenseItems = useMemo(() => {
    const onlyExpenses = expenses.filter((item) => (item.type || 'expense') === 'expense');
    return onlyExpenses.filter((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return false;
      const key = date.toISOString().slice(0, 10);
      if (startDate && key < startDate) return false;
      if (endDate && key > endDate) return false;
      return true;
    });
  }, [endDate, expenses, startDate]);

  const thisMonthDailyTrend = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const byDay = {};
    expenseItems.forEach((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return;
      const day = String(date.getDate()).padStart(2, '0');
      byDay[day] = (byDay[day] || 0) + Number(item.amount || 0);
    });

    return Object.keys(byDay)
      .sort((a, b) => Number(a) - Number(b))
      .map((day) => ({ label: day, amount: byDay[day] }));
  }, [expenseItems]);

  const monthlyTrend = useMemo(() => {
    const byMonth = {};
    expenseItems.forEach((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + Number(item.amount || 0);
    });
    return Object.keys(byMonth).sort().slice(-8).map((key) => ({ month: key, amount: byMonth[key] }));
  }, [expenseItems]);

  const categoryData = useMemo(() => {
    return categories.map((category) => {
      const spent = expenseItems
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return { name: category.name, spent, budget: Number(category.budget || 0), allocation: Number(category.budget || 0) };
    });
  }, [categories, expenseItems]);

  const totals = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const totalBudget = categoryData.reduce((sum, item) => sum + Number(item.budget || 0), 0);
    const totalExpenditure = expenseItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expenditureToday = expenseItems.reduce((sum, item) => {
      const key = new Date(item.date).toISOString().slice(0, 10);
      return key === todayKey ? sum + Number(item.amount || 0) : sum;
    }, 0);
    const totalBudgetAllocated = totalBudget;
    return { totalBudget, totalBudgetAllocated, totalExpenditure, expenditureToday };
  }, [categoryData, expenseItems]);

  const categoriesToday = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const spentMap = {};
    expenseItems.forEach((item) => {
      const key = new Date(item.date).toISOString().slice(0, 10);
      if (key !== todayKey) return;
      spentMap[item.category] = (spentMap[item.category] || 0) + Number(item.amount || 0);
    });

    return categoryData
      .filter((item) => (spentMap[item.name] || 0) > 0)
      .map((item) => ({
        name: item.name,
        budget: item.budget,
        spent: spentMap[item.name] || 0
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 6);
  }, [categoryData, expenseItems]);

  const exportFiltered = () => {
    const header = ['Date', 'Title', 'Category', 'Amount'];
    const rows = expenseItems.map((item) => [
      new Date(item.date).toISOString().slice(0, 10),
      item.title || '',
      item.category || '',
      Number(item.amount || 0)
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reports_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Reports"
      subtitle="Monthly trend and budget insights"
    >
      {loading ? <div className="inline-loading">Refreshing reports...</div> : null}
      <section className="reports-layout">
        <div className="ui-card reports-main-card">
          <div className="reports-toolbar">
            <h3>Reports</h3>
            <div className="reports-filters">
              <label>
                Start date
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label>
                End date
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
              <button className="btn-primary" onClick={exportFiltered}>Export</button>
            </div>
          </div>

          <div className="reports-chart-grid">
            <div className="reports-chart-item">
              <h4>Expenses Today</h4>
              <div className="reports-chart-wrap">
                <ResponsiveContainer>
                  <LineChart data={thisMonthDailyTrend}>
                    <CartesianGrid strokeDasharray="2 2" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line dataKey="amount" stroke="#6b6eff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="reports-chart-item">
              <h4>Expenses Monthly</h4>
              <div className="reports-chart-wrap">
                <ResponsiveContainer>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="2 2" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line dataKey="amount" stroke="#6b6eff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="reports-radar-block">
            <h4>Budget Allocations</h4>
            <div className="reports-radar-wrap">
              <ResponsiveContainer>
                <RadarChart data={categoryData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Radar dataKey="allocation" stroke="#6b6eff" fill="#6b6eff" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <aside className="reports-side-panel">
          <div className="reports-stat-card">
            <span>Total Budget</span>
            <strong>Rs.{Math.round(totals.totalBudget).toLocaleString()}</strong>
          </div>
          <div className="reports-stat-card">
            <span>Total Budget Allocated</span>
            <strong>Rs.{Math.round(totals.totalBudgetAllocated).toLocaleString()}</strong>
          </div>
          <div className="reports-stat-card">
            <span>Total Expenditure</span>
            <strong>Rs.{Math.round(totals.totalExpenditure).toLocaleString()}</strong>
          </div>
          <div className="reports-stat-card">
            <span>Expenditure Today</span>
            <strong>Rs.{Math.round(totals.expenditureToday).toLocaleString()}</strong>
          </div>

          <div className="ui-card reports-categories-today">
            <h4>Categories Today</h4>
            <div className="reports-side-cats-grid">
              {categoriesToday.length ? categoriesToday.map((item) => (
                <div key={item.name} className="reports-mini-cat">
                  <strong>{item.name}</strong>
                  <small>Budget: {Math.round(item.budget).toLocaleString()}</small>
                  <small>Expense: {Math.round(item.spent).toLocaleString()}</small>
                </div>
              )) : <p className="empty-hint">No expenses recorded for today.</p>}
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
};

export default Reports;
