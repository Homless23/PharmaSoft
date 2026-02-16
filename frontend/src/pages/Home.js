import React, { useEffect, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import './DashboardUI.css';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

const Home = () => {
  const {
    user,
    expenses,
    categories,
    goals,
    insights,
    recurringAlerts,
    loading,
    error,
    getData,
    createGoal,
    updateGoal,
    deleteGoal,
    processRecurringDue
  } = useGlobalContext();
  const [goalTitle, setGoalTitle] = React.useState('');
  const [goalTarget, setGoalTarget] = React.useState('');
  const [goalDeadline, setGoalDeadline] = React.useState('');

  useEffect(() => {
    getData();
  }, [getData]);

  const expenseItems = useMemo(
    () => expenses.filter((item) => (item.type || 'expense') === 'expense'),
    [expenses]
  );

  const summaryCards = useMemo(() => {
    const now = new Date();
    const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const currentByCategory = {};
    const prevByCategory = {};

    expenseItems.forEach((item) => {
      const amount = Number(item.amount || 0);
      const itemDate = new Date(item.date);
      if (!Number.isFinite(amount) || Number.isNaN(itemDate.getTime())) return;

      if (itemDate >= startCurrent) {
        currentByCategory[item.category] = (currentByCategory[item.category] || 0) + amount;
      } else if (itemDate >= startPrev && itemDate <= endPrev) {
        prevByCategory[item.category] = (prevByCategory[item.category] || 0) + amount;
      }
    });

    return Object.keys(currentByCategory)
      .map((categoryName) => {
        const current = currentByCategory[categoryName] || 0;
        const previous = prevByCategory[categoryName] || 0;
        const change = previous > 0 ? ((current - previous) / previous) * 100 : 100;
        return { categoryName, current, change };
      })
      .sort((a, b) => b.current - a.current)
      .slice(0, 4);
  }, [expenseItems]);

  const weeklyChartData = useMemo(() => {
    const sorted = [...expenseItems].sort((a, b) => new Date(a.date) - new Date(b.date));
    const map = {};
    sorted.forEach((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + Number(item.amount || 0);
    });
    return Object.keys(map).slice(-8).map((key) => ({
      date: key,
      amount: map[key]
    }));
  }, [expenseItems]);

  const recentTransactions = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8),
    [expenses]
  );

  const pieData = useMemo(() => {
    const totals = {};
    expenseItems.forEach((item) => {
      const amount = Number(item.amount || 0);
      if (!Number.isFinite(amount)) return;
      totals[item.category] = (totals[item.category] || 0) + amount;
    });
    return Object.keys(totals).map((name) => ({ name, value: totals[name] }));
  }, [expenseItems]);

  const chartByCategory = useMemo(() => {
    return (categories || []).map((category) => {
      const spent = expenseItems
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return {
        category: category.name,
        budget: Number(category.budget || 0),
        spent
      };
    });
  }, [categories, expenseItems]);

  const onCreateGoal = async (event) => {
    event.preventDefault();
    const payload = {
      title: goalTitle.trim(),
      targetAmount: Number(goalTarget),
      deadline: goalDeadline || null
    };
    if (!payload.title || !Number.isFinite(payload.targetAmount) || payload.targetAmount <= 0) return;
    const result = await createGoal(payload);
    if (!result.success) return;
    setGoalTitle('');
    setGoalTarget('');
    setGoalDeadline('');
  };

  const addGoalProgress = async (goal, amount) => {
    const nextAmount = Number(goal.currentAmount || 0) + amount;
    await updateGoal(goal._id, { currentAmount: nextAmount });
  };

  return (
    <AppShell
      title={`Hello, ${user?.name || 'User'}!`}
      subtitle="Here's your analytic details"
    >
      {loading ? <div className="inline-loading">Refreshing dashboard data...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="dashboard-home-grid">
        <div className="ui-card">
          <h3 style={{ marginBottom: '10px' }}>Top Expense Categories</h3>
          <div className="dashboard-kpi-grid">
            {summaryCards.length ? summaryCards.map((item) => (
              <article key={item.categoryName} className="kpi-card">
                <span>{item.categoryName} Expense</span>
                <strong>{Math.round(item.current)}</strong>
                <p>
                  {item.change >= 0 ? '+' : ''}
                  {item.change.toFixed(1)}% from last month
                </p>
              </article>
            )) : <p className="empty-hint">No category spending data yet.</p>}
          </div>
        </div>

        <div className="ui-card">
          <h3>Total Expenditure</h3>
          <div style={{ width: '100%', height: '230px' }}>
            <ResponsiveContainer>
              <LineChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="dashboard-home-grid">
        <div className="ui-card">
          <h3 style={{ marginBottom: '8px' }}>Recent Transactions</h3>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Expense</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Date &amp; Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((item) => (
                <tr key={item._id}>
                  <td>{item.title}</td>
                  <td>{item.type === 'income' ? '+' : '-'}{Number(item.amount || 0).toLocaleString()}</td>
                  <td>{item.category}</td>
                  <td>{new Date(item.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ui-card">
          <h3>Category Split</h3>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={85}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ width: '100%', height: '210px' }}>
            <ResponsiveContainer>
              <BarChart data={chartByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="spent" fill="#6366f1" />
                <Bar dataKey="budget" fill="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="dashboard-home-grid">
        <div className="ui-card">
          <h3 style={{ marginBottom: '8px' }}>Goal Buckets</h3>
          <form className="form-grid cols-3" onSubmit={onCreateGoal} style={{ marginBottom: '10px' }}>
            <div className="form-field">
              <label>Goal title</label>
              <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Emergency Fund" />
            </div>
            <div className="form-field">
              <label>Target amount</label>
              <input type="number" min="1" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="50000" />
            </div>
            <div className="form-field">
              <label>Deadline</label>
              <input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} />
            </div>
            <div>
              <button className="btn-primary" type="submit">Add Goal</button>
            </div>
          </form>

          <div className="goals-list">
            {goals.length ? goals.map((goal) => (
              <div key={goal._id} className="goal-item">
                <div className="goal-head">
                  <strong>{goal.title}</strong>
                  <small>{Math.round(goal.currentAmount).toLocaleString()} / {Math.round(goal.targetAmount).toLocaleString()}</small>
                </div>
                <div className="budget-meter" style={{ marginTop: 2 }}>
                  <span style={{ width: `${Math.min(goal.progressPercent || 0, 100)}%` }} />
                </div>
                <div className="goal-actions">
                  <button className="btn-secondary" onClick={() => addGoalProgress(goal, 100)}>+100</button>
                  <button className="btn-secondary" onClick={() => addGoalProgress(goal, 500)}>+500</button>
                  <button className="btn-secondary" onClick={() => updateGoal(goal._id, { status: 'completed' })}>Complete</button>
                  <button className="btn-danger" onClick={() => deleteGoal(goal._id)}>Delete</button>
                </div>
              </div>
            )) : <p className="empty-hint">No goals yet. Create your first savings target.</p>}
          </div>
        </div>

        <div className="ui-card">
          <h3 style={{ marginBottom: '8px' }}>Smart Insights</h3>
          <div className="insights-list">
            {insights?.insights?.length ? insights.insights.map((item) => (
              <div key={item.code} className={`insight-item-card ${item.severity || 'info'}`}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            )) : <p className="empty-hint">Insights will appear after more activity.</p>}
          </div>

          <h3 style={{ margin: '12px 0 8px' }}>Recurring Bills Due</h3>
          {recurringAlerts?.dueCount > 0 ? (
            <div className="recurring-due-list">
              {recurringAlerts.items.slice(0, 5).map((item) => (
                <div key={item._id} className="recurring-due-item">
                  <div>
                    <strong>{item.title}</strong>
                    <small>{new Date(item.nextDueDate).toLocaleDateString()} • {item.frequency}</small>
                  </div>
                  <span>Rs {Math.round(item.amount).toLocaleString()}</span>
                </div>
              ))}
              <button className="btn-primary" style={{ marginTop: '8px' }} onClick={processRecurringDue}>
                Process Auto Due Bills
              </button>
            </div>
          ) : (
            <p className="empty-hint">No due recurring bills right now.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
};

export default Home;
