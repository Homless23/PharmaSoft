import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CategoryPieChart = () => {
  const { expenses } = useContext(GlobalContext);

  // 1. Group Data by Category
  const dataMap = {};
  expenses.forEach(item => {
    dataMap[item.category] = (dataMap[item.category] || 0) + item.amount;
  });

  const data = Object.keys(dataMap).map(key => ({
    name: key,
    value: dataMap[key]
  })).sort((a, b) => b.value - a.value); // Sort biggest to smallest

  // Neon Color Palette
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  // Custom Glass Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
            background: 'rgba(9, 9, 11, 0.9)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '8px',
            padding: '10px'
        }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: '600' }}>{payload[0].name}</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Rs {payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <h3 className="section-title">Spending Split</h3>
      
      {data.length > 0 ? (
        <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{value}</span>}
                />
            </PieChart>
            </ResponsiveContainer>
        </div>
      ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              No data yet.
          </div>
      )}
    </div>
  );
};

export default CategoryPieChart;