import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, DatePicker, Select, Space, Statistic, Typography } from 'antd';
import dayjs from 'dayjs';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import AppShell from '../components/AppShell';
import ChartCard from '../components/ui/ChartCard';
import EmptyState from '../components/ui/EmptyState';
import { useGlobalContext } from '../context/globalContext';
import { exportRowsToPDF, exportTableToXlsx } from '../utils/export';
const Reports = () => {
  const { Title, Text } = Typography;
  const { loading, transactions, categories, getData } = useGlobalContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const categoryFilter = searchParams.get('category') || '';

  useEffect(() => {
    getData();
  }, [getData]);

  const outflowItems = useMemo(() => {
    const onlyOutflows = transactions.filter((item) => (item.type || 'outflow') !== 'income');
    return onlyOutflows.filter((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return false;
      const key = date.toISOString().slice(0, 10);
      if (startDate && key < startDate) return false;
      if (endDate && key > endDate) return false;
      if (categoryFilter && String(item.category || '') !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter, endDate, transactions, startDate]);
  const incomeItems = useMemo(() => {
    return transactions
      .filter((item) => (item.type || 'outflow') === 'income')
      .filter((item) => {
        const date = new Date(item.date);
        if (Number.isNaN(date.getTime())) return false;
        const key = date.toISOString().slice(0, 10);
        if (startDate && key < startDate) return false;
        if (endDate && key > endDate) return false;
        return true;
      });
  }, [endDate, transactions, startDate]);

  const categoryOptions = useMemo(() => {
    const allNames = [
      ...categories.map((item) => String(item.name || '').trim()),
      ...outflowItems.map((item) => String(item.category || '').trim())
    ].filter(Boolean);
    return [...new Set(allNames)].sort((a, b) => a.localeCompare(b));
  }, [categories, outflowItems]);

  const thisMonthDailyTrend = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const byDay = {};

    outflowItems.forEach((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return;
      const day = String(date.getDate()).padStart(2, '0');
      byDay[day] = (byDay[day] || 0) + Number(item.amount || 0);
    });

    return Object.keys(byDay)
      .sort((a, b) => Number(a) - Number(b))
      .map((day) => ({ label: day, amount: byDay[day] }));
  }, [outflowItems]);

  const monthlyTrend = useMemo(() => {
    const byMonth = {};
    outflowItems.forEach((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + Number(item.amount || 0);
    });
    return Object.keys(byMonth).sort().slice(-8).map((key) => ({ month: key, amount: byMonth[key] }));
  }, [outflowItems]);

  const categoryData = useMemo(() => {
    return categories.map((category) => {
      const spent = outflowItems
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return {
        name: category.name,
        spent,
        budget: Number(category.budget || 0),
        allocation: Number(category.budget || 0)
      };
    });
  }, [categories, outflowItems]);

  const radarData = useMemo(() => {
    const incomeLike = new Set(['retail sales', 'online orders', 'insurance claims', 'clinic supplies', 'wholesale']);
    return categoryData
      .filter((item) => Number(item.allocation || 0) > 0)
      .filter((item) => !incomeLike.has(String(item.name || '').toLowerCase()))
      .sort((a, b) => Number(b.allocation || 0) - Number(a.allocation || 0))
      .slice(0, 7);
  }, [categoryData]);

  const totals = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const totalBudget = categoryData.reduce((sum, item) => sum + Number(item.budget || 0), 0);
    const totalOutflow = outflowItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalRevenue = incomeItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const grossProfit = totalRevenue - totalOutflow;
    const outflowToday = outflowItems.reduce((sum, item) => {
      const key = new Date(item.date).toISOString().slice(0, 10);
      return key === todayKey ? sum + Number(item.amount || 0) : sum;
    }, 0);
    return {
      totalBudget,
      totalBudgetAllocated: totalBudget,
      totalOutflow,
      outflowToday,
      totalRevenue,
      grossProfit
    };
  }, [categoryData, outflowItems, incomeItems]);

  const categoriesToday = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const spentMap = {};

    outflowItems.forEach((item) => {
      const key = new Date(item.date).toISOString().slice(0, 10);
      if (key !== todayKey) return;
      spentMap[item.category] = (spentMap[item.category] || 0) + Number(item.amount || 0);
    });

    return categoryData
      .filter((item) => (spentMap[item.name] || 0) > 0)
      .map((item) => ({
        name: item.name,
        budget: item.budget,
        spent: spentMap[item.name] || 0
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 6);
  }, [categoryData, outflowItems]);

  const exportFilteredXlsx = () => {
    const header = ['Date', 'Title', 'Category', 'Amount'];
    const rows = outflowItems.map((item) => [
      new Date(item.date).toISOString().slice(0, 10),
      item.title || '',
      item.category || '',
      Number(item.amount || 0)
    ]);
    exportTableToXlsx({
      headers: header,
      rows,
      filename: `reports_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Reports'
    });
  };

  const exportFilteredPdf = () => {
    const header = ['Date', 'Title', 'Category', 'Amount'];
    const rows = outflowItems.map((item) => [
      new Date(item.date).toISOString().slice(0, 10),
      String(item.title || ''),
      String(item.category || ''),
      `Rs.${Math.round(Number(item.amount || 0)).toLocaleString()}`
    ]);
    exportRowsToPDF({
      title: 'Pharmacy Reports',
      headers: header,
      rows,
      filename: `reports_${new Date().toISOString().slice(0, 10)}.pdf`
    });
  };

  return (
    <AppShell
      title="Reports"
      subtitle="Monthly pharmacy trends, procurement, and profit insights"
    >
      {loading ? <Alert style={{ marginBottom: 16 }} type="info" showIcon message="Refreshing pharmacy reports..." /> : null}
      <section className="reports-layout">
        <Card className="reports-main-card fade-in">
          <div className="reports-toolbar">
            <Title level={3} style={{ marginBottom: 0 }}>Reports</Title>
            <Space wrap className="reports-filters">
              <DatePicker
                placeholder="Start date"
                value={startDate ? dayjs(startDate) : null}
                onChange={(value) => setStartDate(value ? value.format('YYYY-MM-DD') : '')}
              />
              <DatePicker
                placeholder="End date"
                value={endDate ? dayjs(endDate) : null}
                onChange={(value) => setEndDate(value ? value.format('YYYY-MM-DD') : '')}
              />
              <Select
                style={{ width: 220 }}
                value={categoryFilter || undefined}
                placeholder="All Categories"
                allowClear
                options={categoryOptions.map((name) => ({ value: name, label: name }))}
                onChange={(value) => {
                  const next = new URLSearchParams(searchParams);
                  if (value) next.set('category', value);
                  else next.delete('category');
                  setSearchParams(next);
                }}
              />
              <Button type="primary" onClick={exportFilteredXlsx}>Export Excel</Button>
              <Button onClick={exportFilteredPdf}>Export PDF</Button>
            </Space>
          </div>

          <div className="reports-chart-grid">
            <ChartCard title="Purchases Today">
              <div className="reports-chart-wrap">
                <ResponsiveContainer>
                  <AreaChart data={thisMonthDailyTrend}>
                    <CartesianGrid strokeDasharray="2 2" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`Rs.${Math.round(Number(value || 0)).toLocaleString()}`, 'Amount']} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#6366f1"
                      fill="#c7d2fe"
                      fillOpacity={0.6}
                      strokeWidth={2.2}
                      isAnimationActive
                      animationDuration={700}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Purchases Monthly">
              <div className="reports-chart-wrap">
                <ResponsiveContainer>
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="2 2" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`Rs.${Math.round(Number(value || 0)).toLocaleString()}`, 'Amount']} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#4f46e5"
                      fill="#c4b5fd"
                      fillOpacity={0.48}
                      strokeWidth={2.2}
                      isAnimationActive
                      animationDuration={760}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="reports-radar-block">
            <h4>Stock Budget Allocations</h4>
            <div className="reports-radar-wrap">
              {radarData.length ? (
                <ResponsiveContainer>
                  <RadarChart data={radarData} outerRadius="78%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`Rs.${Math.round(Number(value || 0)).toLocaleString()}`, 'Allocation']} />
                    <Radar dataKey="allocation" stroke="#6b6eff" fill="#6b6eff" fillOpacity={0.32} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No allocation data" description="Set category budgets to view radar allocation." />
              )}
            </div>
          </div>
        </Card>

        <aside className="reports-side-panel">
          <Card><Statistic title="Total Budget" value={`Rs.${Math.round(totals.totalBudget).toLocaleString()}`} /></Card>
          <Card><Statistic title="Total Budget Allocated" value={`Rs.${Math.round(totals.totalBudgetAllocated).toLocaleString()}`} /></Card>
          <Card><Statistic title="Total Procurement" value={`Rs.${Math.round(totals.totalOutflow).toLocaleString()}`} /></Card>
          <Card><Statistic title="Total Revenue" value={`Rs.${Math.round(totals.totalRevenue).toLocaleString()}`} /></Card>
          <Card><Statistic title="Gross Profit" value={`Rs.${Math.round(totals.grossProfit).toLocaleString()}`} /></Card>
          <Card><Statistic title="Procurement Today" value={`Rs.${Math.round(totals.outflowToday).toLocaleString()}`} /></Card>

          <Card className="reports-categories-today">
            <Title level={4}>Procurement Categories Today</Title>
            <div className="reports-side-cats-grid">
              {categoriesToday.length ? categoriesToday.map((item) => (
                <div key={item.name} className="reports-mini-cat">
                  <strong>{item.name}</strong>
                  <Text type="secondary">Budget: {Math.round(item.budget).toLocaleString()}</Text>
                  <Text type="secondary">Purchased: {Math.round(item.spent).toLocaleString()}</Text>
                </div>
              )) : (
                <EmptyState
                  title="No purchases today"
                  description="Today-wise category breakdown will appear once you add pharmacy purchases."
                />
              )}
            </div>
          </Card>
        </aside>
      </section>
    </AppShell>
  );
};

export default Reports;


