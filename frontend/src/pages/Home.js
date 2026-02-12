import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FiBarChart2, FiClock, FiHome } from 'react-icons/fi';
import Spinner from '../components/Spinner';
import AddTransactionModal from '../components/AddTransactionModal';
import { useGlobalContext } from '../context/globalContext';
import { getCategoryIcon } from '../utils/categoryIcons';
import './Home.css';

const Home = () => {
  const { user, loading, error, expenses, getData, logoutUser } = useGlobalContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const safeName = (() => {
    const raw = String(user?.name || '').trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (['project', 'undefined', 'null'].includes(lower)) return null;
    return raw;
  })();

  useEffect(() => {
    getData();
  }, [getData]);

  const totals = useMemo(() => {
    const income = expenses
      .filter((x) => x.type === 'income')
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const outgoing = expenses
      .filter((x) => (x.type || 'expense') === 'expense')
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
    return {
      income,
      outgoing,
      balance: income - outgoing
    };
  }, [expenses]);

  const recentTransactions = useMemo(() => {
    return [...expenses]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [expenses]);

  if (loading) return <Spinner />;

  return (
    <div className="home-container">
      <header className="top-nav glass">
        <div>
          <p className="eyebrow">Expense OS Dashboard</p>
          <h1>{safeName ? `Welcome, ${safeName}` : 'Welcome back'}</h1>
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
          <button className="danger-btn" onClick={logoutUser}>Logout</button>
        </div>
      </header>

      {error && <div className="alert-error">{error}</div>}

      <section className="stats-grid">
        <article className="glass stat-card">
          <p>Total Income</p>
          <h2 className="text-success">Rs {totals.income.toLocaleString()}</h2>
        </article>
        <article className="glass stat-card">
          <p>Total Expense</p>
          <h2 className="text-danger">Rs {totals.outgoing.toLocaleString()}</h2>
        </article>
        <article className="glass stat-card">
          <p>Net Balance</p>
          <h2 className={totals.balance >= 0 ? 'text-success' : 'text-danger'}>
            Rs {totals.balance.toLocaleString()}
          </h2>
        </article>
        <article className="glass stat-card">
          <p>Transactions</p>
          <h2>{expenses.length.toLocaleString()}</h2>
        </article>
      </section>

      <section className="glass panel history-panel dashboard-section">
        <div className="history-header">
          <h3 style={{ margin: 0 }}>Recent Activity (Latest 5)</h3>
          <Link to="/history" className="ghost-btn">View Full History</Link>
        </div>

        {recentTransactions.length ? (
          <div className="group-list">
            {recentTransactions.map((item) => (
              <div key={item._id} className="transaction-item">
                <div className="t-left">
                  <div className="t-icon">{getCategoryIcon(item.category, item.type)}</div>
                  <div className="t-details">
                    <span className="t-title">{item.title}</span>
                    <span className="t-meta">
                      {(item.type || 'expense').toUpperCase()} | {item.category} | {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="t-right">
                  <span className={item.type === 'income' ? 'text-success t-amount' : 'text-danger t-amount'}>
                    {item.type === 'income' ? '+' : '-'} Rs {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No transactions yet. Add your first one.</div>
        )}
      </section>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => getData()}
      />
    </div>
  );
};

export default Home;
