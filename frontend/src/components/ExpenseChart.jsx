import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label
} from 'recharts';
import { useGlobalContext } from '../context/globalContext';

const ExpenseChart = ({ expenses: externalExpenses }) => {
  const { expenses } = useGlobalContext();
  const sourceExpenses = Array.isArray(externalExpenses) ? externalExpenses : expenses;

  const byDate = {};
  sourceExpenses.forEach((expense) => {
    if ((expense.type || 'expense') !== 'expense') return;
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
    <div className="card analytics-chart-card analytics-trend-card" style={{ height: '500px' }}>
      <h3 className="section-title">Spending Trend</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tick={{ fill: '#c7dbf3', fontSize: 12 }} axisLine={false} tickLine={false}>
              <Label value="Date" position="insideBottom" dy={10} style={{ fill: '#9cb4d3', fontSize: 11 }} />
            </XAxis>
            <YAxis tick={{ fill: '#c7dbf3', fontSize: 12 }} axisLine={false} tickLine={false}>
              <Label
                value="Expense Amount"
                angle={-90}
                position="insideLeft"
                style={{ fill: '#9cb4d3', fontSize: 11, textAnchor: 'middle' }}
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 2.5, fill: '#3b82f6' }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 1 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state">No trend data yet.</div>
      )}
    </div>
  );
};

export default ExpenseChart;
