import React from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const TrendChart = ({ data }) => {
  // Aggregate data by month
  const monthlyData = data.reduce((acc, t) => {
    const month = new Date(t.createdAt).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + (t.amount < 0 ? Math.abs(t.amount) : 0);
    return acc;
  }, {});

  const chartData = {
    labels: Object.keys(monthlyData),
    datasets: [{
      label: 'Expenses (Rs)',
      data: Object.values(monthlyData),
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
      borderRadius: 8,
      hoverBackgroundColor: '#6366f1'
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#64748b' }, grid: { display: false } }
    },
    plugins: {
      legend: { display: false }
    }
  };

  return (
    <div style={{ height: '350px' }}>
      {Object.keys(monthlyData).length > 0 ? (
        <Bar data={chartData} options={options} />
      ) : (
        <div className="no-data-placeholder">No transaction history to display.</div>
      )}
    </div>
  );
};

export default TrendChart;