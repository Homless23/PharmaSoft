import React, { useContext } from 'react';
import { GlobalContext } from '../context/globalContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ExpenseChart = () => {
  const { expenses } = useContext(GlobalContext);

  // 1. Group Data by Date
  const dataMap = {};
  expenses.forEach(expense => {
    const date = new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    dataMap[date] = (dataMap[date] || 0) + expense.amount;
  });

  // Convert to Array & Sort by Date
  // (Note: Sorting purely by string "Feb 12" is tricky, in a real app use timestamps. 
  // For now, we assume expenses come in order or we reverse them if they are newest-first)
  const data = Object.keys(dataMap).map(date => ({
    name: date,
    amount: dataMap[date]
  })).reverse(); // Assuming expenses are stored newest-first

  // Custom "Glass" Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
            background: 'rgba(24, 24, 27, 0.9)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{label}</p>
          <p style={{ margin: '4px 0 0', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>
            Rs {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <h3 className="section-title">Spending Trend</h3>
      
      {data.length > 0 ? (
        <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    tickFormatter={(val) => `Rs${val/1000}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                />
            </AreaChart>
            </ResponsiveContainer>
        </div>
      ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              No data to visualize yet.
          </div>
      )}
    </div>
  );
};

export default ExpenseChart;