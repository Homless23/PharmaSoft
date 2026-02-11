import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const CategoryChart = ({ data }) => {
  const categories = [...new Set(data.map(t => t.category))];
  const categoryTotals = categories.map(cat => {
    return data
      .filter(t => t.category === cat && t.amount < 0)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  });

  const chartData = {
    labels: categories,
    datasets: [{
      data: categoryTotals,
      backgroundColor: [
        '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'
      ],
      borderWidth: 0,
      hoverOffset: 15
    }]
  };

  const options = {
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter' } } }
    },
    maintainAspectRatio: false
  };

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      {categoryTotals.length > 0 ? (
        <Pie data={chartData} options={options} />
      ) : (
        <div className="no-data-placeholder">No expenses found for this selection.</div>
      )}
    </div>
  );
};

export default CategoryChart;