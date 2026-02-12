import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGlobalContext } from '../context/globalContext';

const ExpenseChart = () => {
  const { expenses } = useGlobalContext();

  const byDate = {};
  expenses.forEach((expense) => {
    const amount = Number(expense.amount || 0);
    const date = new Date(expense.date);
    if (!Number.isFinite(amount) || Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    byDate[key] = (byDate[key] || 0) + amount;
  });

  const data = Object.keys(byDate)
    .sort((a, b) => new Date(a) - new Date(b))
    .map((dateKey) => ({
      name: new Date(dateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      amount: byDate[dateKey]
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{ background: 'rgba(8, 20, 40, 0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '0.6rem' }}>
        <p style={{ margin: 0 }}>{label}</p>
        <strong>Rs {Number(payload[0].value || 0).toLocaleString()}</strong>
      </div>
    );
  };

  return (
    <div className="card" style={{ height: '420px' }}>
      <h3 className="section-title">Spending Trend</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tick={{ fill: '#c7dbf3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#c7dbf3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="amount" stroke="#22d3ee" strokeWidth={2.5} fill="url(#expenseGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state">No trend data yet.</div>
      )}
    </div>
  );
};

export default ExpenseChart;
