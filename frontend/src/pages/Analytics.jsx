import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BudgetSection from '../components/BudgetSection';
import CategoryPieChart from '../components/CategoryPieChart';
import ExpenseChart from '../components/ExpenseChart';
import OnboardingWizard from '../components/OnboardingWizard';
import Spinner from '../components/Spinner';
import TransactionList from '../components/TransactionList';
import { useGlobalContext } from '../context/globalContext';
import './Home.css';

const Analytics = () => {
  const { loading, getData, logoutUser } = useGlobalContext();
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    getData();
  }, [getData]);

  if (loading) return <Spinner />;

  return (
    <div className="home-container">
      <header className="top-nav glass">
        <div>
          <p className="eyebrow">Expense OS</p>
          <h1>Analytics & Budget Planning</h1>
        </div>
        <div className="nav-actions">
          <Link to="/" className="ghost-btn">Dashboard</Link>
          <button className="ghost-btn" onClick={() => setShowWizard(true)}>Auto Budget</button>
          <button className="danger-btn" onClick={logoutUser}>Logout</button>
        </div>
      </header>

      <section className="charts-grid">
        <ExpenseChart />
        <CategoryPieChart />
      </section>

      <section className="main-grid" style={{ marginTop: '1.5rem' }}>
        <BudgetSection />
        <TransactionList />
      </section>

      {showWizard && <OnboardingWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
};

export default Analytics;
