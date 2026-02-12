import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiBarChart2, FiClock, FiHome } from 'react-icons/fi';
import AddTransactionModal from '../components/AddTransactionModal';
import BudgetSection from '../components/BudgetSection';
import CategoryPieChart from '../components/CategoryPieChart';
import ExpenseChart from '../components/ExpenseChart';
import Spinner from '../components/Spinner';
import { useGlobalContext } from '../context/globalContext';
import './Home.css';

const Analytics = () => {
  const { expenses, categories, loading, getData } = useGlobalContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    getData();
  }, [getData]);

  const filteredExpenses = useMemo(() => {
    if (!startDate && !endDate) return expenses;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    return expenses.filter((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return false;
      if (start && date < start) return false;
      if (end) {
        const endWithTime = new Date(end);
        endWithTime.setHours(23, 59, 59, 999);
        if (date > endWithTime) return false;
      }
      return true;
    });
  }, [expenses, startDate, endDate]);

  const metrics = useMemo(() => {
    const expenseItems = filteredExpenses.filter((x) => (x.type || 'expense') === 'expense');
    const byCategory = {};
    expenseItems.forEach((item) => {
      const amount = Number(item.amount || 0);
      if (!Number.isFinite(amount)) return;
      byCategory[item.category] = (byCategory[item.category] || 0) + amount;
    });

    const biggest = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || null;
    const totalExpense = expenseItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const uniqueDays = new Set(
      expenseItems
        .map((item) => {
          const d = new Date(item.date);
          return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
        })
        .filter(Boolean)
    ).size;
    const avgDaily = uniqueDays > 0 ? totalExpense / uniqueDays : 0;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const prevMonthDate = new Date(thisYear, thisMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const allExpenseItems = expenses.filter((x) => (x.type || 'expense') === 'expense');
    const currentMonthTotal = allExpenseItems
      .filter((x) => {
        const d = new Date(x.date);
        return !Number.isNaN(d.getTime()) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const previousMonthTotal = allExpenseItems
      .filter((x) => {
        const d = new Date(x.date);
        return !Number.isNaN(d.getTime()) && d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);

    const momChangePercent = previousMonthTotal > 0
      ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
      : (currentMonthTotal > 0 ? 100 : 0);

    const monthlyBudget = categories.reduce((sum, c) => sum + Number(c.budget || 0), 0);
    return {
      biggestCategory: biggest ? biggest[0] : 'No data',
      biggestCategoryAmount: biggest ? biggest[1] : 0,
      averageDailySpend: avgDaily,
      momChangePercent,
      monthlyBudget
    };
  }, [filteredExpenses, expenses, categories]);

  if (loading) return <Spinner />;

  return (
    <div className="home-container">
      <header className="top-nav glass">
        <div>
          <p className="eyebrow">Expense OS</p>
          <h1>Analytics</h1>
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

      <main className="analytics-layout">
        <section className="glass panel filter-panel analytics-filter-panel">
          <div className="history-header analytics-filter-head">
            <div>
              <h3 className="analytics-title">Date Range</h3>
              <p className="muted analytics-subtitle">Filter all analytics widgets by period.</p>
            </div>
            <div className="history-filters">
              <input className="input compact" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input className="input compact" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <button className="ghost-btn" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>
            </div>
          </div>
        </section>

        <section className="analytics-hero">
          <ExpenseChart expenses={filteredExpenses} />
        </section>

        <section className="main-grid analytics-bottom-grid">
          <CategoryPieChart expenses={filteredExpenses} />
          <article className="glass panel analytics-note-panel insights-panel">
            <h3>High Level Insights</h3>
            <div className="insight-item">
              <span className="insight-label">Biggest Expense Category</span>
              <strong>{metrics.biggestCategory} (Rs {metrics.biggestCategoryAmount.toLocaleString()})</strong>
            </div>
            <div className="insight-item">
              <span className="insight-label">Average Daily Spend</span>
              <strong>Rs {metrics.averageDailySpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="insight-item">
              <span className="insight-label">Month-over-Month Change</span>
              <strong className={metrics.momChangePercent > 0 ? 'text-danger' : 'text-success'}>
                {metrics.momChangePercent >= 0 ? '+' : ''}{metrics.momChangePercent.toFixed(1)}%
              </strong>
            </div>
            <div className="insight-item">
              <span className="insight-label">Monthly Budget Capacity</span>
              <strong>Rs {metrics.monthlyBudget.toLocaleString()}</strong>
            </div>
          </article>
        </section>

        <section className="analytics-budget-section">
          <BudgetSection />
        </section>
      </main>

      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => getData()} />
    </div>
  );
};

export default Analytics;
