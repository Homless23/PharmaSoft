import React from 'react';
import { Card, Empty } from 'antd';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const SalesTrendChart = ({ data = [] }) => {
  return (
    <Card title="Sales Trend (Daily)">
      {data.length ? (
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `Rs.${Number(value || 0).toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#1677ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty description="No sales trend data yet" />
      )}
    </Card>
  );
};

export default SalesTrendChart;
