import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useGlobalContext } from '../context/globalContext';

const COLORS = ['#3b82f6', '#f59e0b', '#14b8a6', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16'];

const CategoryPieChart = ({ expenses: externalExpenses }) => {
  const { expenses } = useGlobalContext();
  const sourceExpenses = Array.isArray(externalExpenses) ? externalExpenses : expenses;
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const dataMap = {};
  sourceExpenses.forEach((item) => {
    if ((item.type || 'expense') !== 'expense') return;
    const amount = Number(item.amount || 0);
    if (!item.category || !Number.isFinite(amount)) return;
    dataMap[item.category] = (dataMap[item.category] || 0) + amount;
  });

  const data = Object.keys(dataMap)
    .map((key) => ({ name: key, value: dataMap[key] }))
    .sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{ background: 'rgba(8, 20, 40, 0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '0.6rem' }}>
        <p style={{ margin: 0 }}>{payload[0].name}</p>
        <strong>Rs {Number(payload[0].value || 0).toLocaleString()}</strong>
      </div>
    );
  };

  return (
    <div className="card analytics-chart-card analytics-split-card" style={{ height: '500px' }}>
      <h3 className="section-title">Spending Split</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={72}
              outerRadius={118}
              paddingAngle={3}
              labelLine={false}
              label={({ percent, x, y }) => (
                <text x={x} y={y} fill="#d9ebff" fontSize={11} textAnchor="middle" dominantBaseline="central">
                  {(percent * 100).toFixed(0)}%
                </text>
              )}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={activeIndex === -1 || activeIndex === index ? 1 : 0.35}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(-1)}
              formatter={(value) => <span style={{ color: 'rgba(235,245,255,0.85)' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state">No expense data yet.</div>
      )}
    </div>
  );
};

export default CategoryPieChart;
