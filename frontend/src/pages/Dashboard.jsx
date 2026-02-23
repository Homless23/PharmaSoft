import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Table, Tag } from 'antd';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import api from '../services/api';
import KpiCard from '../components/ui/KpiCard';
import ChartCard from '../components/ui/ChartCard';
import EmptyState from '../components/ui/EmptyState';
import SalesTrendChart from '../components/modules/analytics/SalesTrendChart';
import ExpiryHeatmap from '../components/modules/analytics/ExpiryHeatmap';
import StaffActivityFeed from '../components/modules/analytics/StaffActivityFeed';
import { exportTransactionsToCSV } from '../utils/export';
import './DashboardUI.css';

const PIE_COLORS = ['#94a3b8', '#64748b', '#cbd5e1', '#475569', '#e2e8f0', '#334155', '#0f172a'];

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    transactions,
    categories,
    insights,
    recurringAlerts,
    notifications,
    loading,
    error,
    getData,
    processRecurringDue
  } = useGlobalContext();
  const [todaySalesTotal, setTodaySalesTotal] = useState(0);
  const [salesTrendData, setSalesTrendData] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);

  useEffect(() => {
    getData();
  }, [getData]);

  useEffect(() => {
    let mounted = true;
    const loadSales = async () => {
      try {
        const summaryRes = await api.get('/v1/dashboard/summary');
        const summary = summaryRes?.data || {};
        const total = Number(summary?.sales?.today || 0);
        const trend = Array.isArray(summary?.trend)
          ? summary.trend.map((row) => ({
            date: row.date,
            revenue: Number(row?.sales || 0)
          }))
          : [];
        if (mounted) {
          setTodaySalesTotal(Number(total.toFixed(2)));
          setSalesTrendData(trend);
          setDashboardSummary(summary);
        }
      } catch {
        if (mounted) {
          setTodaySalesTotal(0);
          setSalesTrendData([]);
          setDashboardSummary(null);
        }
      }
    };
    loadSales();
    return () => { mounted = false; };
  }, [transactions.length]);

  const outflowItems = useMemo(
    () => transactions.filter((item) => (item.type || 'outflow') !== 'income'),
    [transactions]
  );

  const summaryCards = useMemo(() => {
    const now = new Date();
    const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const currentByCategory = {};
    const prevByCategory = {};

    outflowItems.forEach((item) => {
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
        const diff = Math.abs(current - previous);
        return {
          categoryName,
          current,
          change,
          previous,
          deltaLabel: previous > 0
            ? `${Math.round(diff).toLocaleString()} ${current >= previous ? 'more' : 'less'}`
            : 'N/A'
        };
      })
      .sort((a, b) => b.current - a.current)
      .slice(0, 4);
  }, [outflowItems]);

  const weeklyChartData = useMemo(() => {
    const sorted = [...outflowItems].sort((a, b) => new Date(a.date) - new Date(b.date));
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
  }, [outflowItems]);

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8),
    [transactions]
  );

  const pieData = useMemo(() => {
    const totals = {};
    outflowItems.forEach((item) => {
      const amount = Number(item.amount || 0);
      if (!Number.isFinite(amount)) return;
      totals[item.category] = (totals[item.category] || 0) + amount;
    });
    return Object.keys(totals).map((name) => ({ name, value: totals[name] }));
  }, [outflowItems]);

  const totalPie = useMemo(() => pieData.reduce((sum, item) => sum + Number(item.value || 0), 0), [pieData]);

  const chartByCategory = useMemo(() => {
    return (categories || []).map((category) => {
      const spent = outflowItems
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return {
        category: category.name,
        budget: Number(category.budget || 0),
        spent
      };
    });
  }, [categories, outflowItems]);

  const controlTower = useMemo(() => {
    if (dashboardSummary?.inventory) {
      return {
        expiringSoon: Number(dashboardSummary.inventory.nearExpiry || 0),
        lowStock: Number(dashboardSummary.inventory.lowStock || 0)
      };
    }
    const now = new Date();
    return (categories || []).reduce((acc, item) => {
      if (item?.active === false) return acc;
      const stockQty = Number(item?.stockQty || 0);
      const reorderPoint = Math.max(Number(item?.reorderPoint ?? 10) || 0, 0);
      if (stockQty < reorderPoint) acc.lowStock += 1;

      const expiry = item?.expiryDate ? new Date(item.expiryDate) : null;
      if (expiry && !Number.isNaN(expiry.getTime()) && stockQty > 0) {
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays <= 30) acc.expiringSoon += 1;
      }
      return acc;
    }, { expiringSoon: 0, lowStock: 0 });
  }, [categories, dashboardSummary]);

  const inventoryAlerts = useMemo(() => {
    const now = new Date();
    const expiringSoon = [];
    const lowStock = [];
    (categories || []).forEach((item) => {
      if (item?.active === false) return;
      const stockQty = Math.max(Number(item?.stockQty) || 0, 0);
      const reorderPoint = Math.max(Number(item?.reorderPoint ?? 10) || 0, 0);
      const expiry = item?.expiryDate ? new Date(item.expiryDate) : null;
      if (stockQty < reorderPoint) {
        lowStock.push({
          _id: item._id,
          name: item.name,
          stockQty,
          reorderPoint
        });
      }
      if (expiry && !Number.isNaN(expiry.getTime())) {
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays <= 60) {
          expiringSoon.push({
            _id: item._id,
            name: item.name,
            daysLeft: diffDays,
            expiryDate: expiry,
            stockQty
          });
        }
      }
    });
    expiringSoon.sort((a, b) => a.daysLeft - b.daysLeft);
    lowStock.sort((a, b) => a.stockQty - b.stockQty);
    return {
      expiringSoon,
      lowStock,
      hasAlerts: expiringSoon.length > 0 || lowStock.length > 0
    };
  }, [categories]);

  const exportDashboard = () => {
    exportTransactionsToCSV(
      outflowItems,
      `dashboard_procurement_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };
  const recentColumns = useMemo(
    () => [
      { title: 'Entry', dataIndex: 'title', key: 'title' },
      {
        title: 'Amount',
        key: 'amount',
        render: (_, item) => (
          <Tag color={item.type === 'income' ? 'green' : 'red'}>
            {item.type === 'income' ? '+' : '-'}{Number(item.amount || 0).toLocaleString()}
          </Tag>
        )
      },
      { title: 'Category', dataIndex: 'category', key: 'category' },
      { title: 'Date & Time', key: 'date', render: (_, item) => new Date(item.date).toLocaleString() }
    ],
    []
  );

  return (
    <AppShell
      title={`Hello, ${user?.name || 'User'}!`}
      subtitle="Here is your pharmacy operations snapshot"
    >
      {loading ? <Alert style={{ marginBottom: 16 }} type="info" showIcon message="Refreshing dashboard data..." /> : null}
      {error ? <Alert style={{ marginBottom: 16 }} type="error" showIcon message={error} /> : null}

      <section className="dashboard-status-grid">
        <div className={`status-card danger ${controlTower.expiringSoon > 0 ? 'is-alert' : 'is-idle'}`}>
          <p>Total Expiring Medicines (30d)</p>
          <strong>{controlTower.expiringSoon}</strong>
          <small>{controlTower.expiringSoon > 0 ? 'Needs action' : 'All clear'}</small>
        </div>
        <div className={`status-card warning ${controlTower.lowStock > 0 ? 'is-alert' : 'is-idle'}`}>
          <p>Low Stock Items</p>
          <strong>{controlTower.lowStock}</strong>
          <small>{controlTower.lowStock > 0 ? 'Restock soon' : 'Stock healthy'}</small>
        </div>
        <div className={`status-card success ${todaySalesTotal > 0 ? 'is-alert' : 'is-idle'}`}>
          <p>Today's Total Sales</p>
          <strong>Rs.{Math.round(todaySalesTotal).toLocaleString()}</strong>
          <small>{todaySalesTotal > 0 ? 'Sales active today' : 'No sales yet'}</small>
        </div>
      </section>

      <section className="dashboard-home-grid">
        <SalesTrendChart data={salesTrendData} />
        <div style={{ display: 'grid', gap: 12 }}>
          <ExpiryHeatmap medicines={categories || []} />
          <StaffActivityFeed notifications={notifications || []} />
        </div>
      </section>

      <section className="dashboard-home-grid">
        <div className="ui-card fade-in">
          <h3 className="section-heading">Top Procurement Categories</h3>
          <div className="dashboard-kpi-grid">
            {summaryCards.length ? summaryCards.map((item) => (
              <KpiCard
                key={item.categoryName}
                title={`${item.categoryName} Purchase`}
                value={Math.round(item.current).toLocaleString()}
                trend={item.change}
                meta={item.deltaLabel}
                onViewReport={() => navigate(`/reports?category=${encodeURIComponent(item.categoryName)}`)}
              />
            )) : <EmptyState title="No procurement data yet" description="Your category trends will appear once entries are added." />}
          </div>
        </div>

        <ChartCard
          title="Total Procurement"
          actions={(
            <Button type="primary" onClick={exportDashboard}>
              Export
            </Button>
          )}
        >
          <div className="chart-box h-230">
            <ResponsiveContainer>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="1 0" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar
                  dataKey="amount"
                  name="Purchases"
                  fill="#64748b"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="dashboard-home-grid">
        <div className="ui-card fade-in">
          <h3 className="section-heading">Recent Sales & Purchases</h3>
          {recentTransactions.length ? (
            <Table rowKey="_id" dataSource={recentTransactions} columns={recentColumns} pagination={{ pageSize: 8 }} />
          ) : (
            <EmptyState title="No recent entries" description="Your latest pharmacy entries will appear here." />
          )}
        </div>

        <div className="ui-card fade-in">
          <h3 className="section-heading">Category Split</h3>
          <div className="chart-box h-250">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label={false}
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, ctx) => {
                    const pct = totalPie > 0 ? ((Number(value || 0) / totalPie) * 100).toFixed(1) : '0.0';
                    return [`Rs ${Number(value || 0).toLocaleString()} (${pct}%)`, String(ctx?.payload?.name || 'Spent')];
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-box h-210">
            <ResponsiveContainer>
              <BarChart data={chartByCategory}>
                <CartesianGrid strokeDasharray="1 0" stroke="#e5e7eb" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="spent" fill="#64748b" />
                <Bar dataKey="budget" fill="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="dashboard-home-grid single-column">
        <div className="ui-card fade-in">
          <h3 className="section-heading">Auto-Expiry & Low Stock Alerts</h3>
          {inventoryAlerts.hasAlerts ? (
            <div className="inventory-alerts-grid">
              <div className="inventory-alert-block">
                <div className="inventory-alert-head">
                  <strong>Expiring in Next 60 Days</strong>
                  <span className="status-chip" style={{ color: '#9a3412', background: '#fed7aa' }}>
                    {inventoryAlerts.expiringSoon.length}
                  </span>
                </div>
                {inventoryAlerts.expiringSoon.length ? (
                  <div className="inventory-alert-list">
                    {inventoryAlerts.expiringSoon.slice(0, 8).map((item) => (
                      <div key={item._id} className="inventory-alert-item">
                        <div>
                          <strong>{item.name}</strong>
                          <small>Qty: {item.stockQty}</small>
                        </div>
                        <span>{item.daysLeft}d</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="empty-hint">No medicines expiring within 60 days.</p>}
              </div>
              <div className="inventory-alert-block">
                <div className="inventory-alert-head">
                  <strong>Below Reorder Point</strong>
                  <span className="status-chip" style={{ color: '#b91c1c', background: '#fee2e2' }}>
                    {inventoryAlerts.lowStock.length}
                  </span>
                </div>
                {inventoryAlerts.lowStock.length ? (
                  <div className="inventory-alert-list">
                    {inventoryAlerts.lowStock.slice(0, 8).map((item) => (
                      <div key={item._id} className="inventory-alert-item">
                        <div>
                          <strong>{item.name}</strong>
                          <small>Reorder: {item.reorderPoint}</small>
                        </div>
                        <span>{item.stockQty}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="empty-hint">No low-stock medicines right now.</p>}
              </div>
            </div>
          ) : (
            <p className="empty-hint">No expiry or low-stock alerts right now.</p>
          )}

          <h3 className="section-heading">Operational Insights</h3>
          <div className="insights-list">
            {insights?.insights?.length ? insights.insights.map((item) => (
              <div key={item.code} className={`insight-item-card ${item.severity || 'info'}`}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            )) : <p className="empty-hint">Insights will appear after more activity.</p>}
          </div>

          <h3 className="section-heading mt-12">Recurring Supplier Dues</h3>
          {recurringAlerts?.dueCount > 0 ? (
            <div className="recurring-due-list">
              {recurringAlerts.items.slice(0, 5).map((item) => (
                <div key={item._id} className="recurring-due-item">
                  <div>
                    <strong>{item.title}</strong>
                    <small>{new Date(item.nextDueDate).toLocaleDateString()} - {item.frequency}</small>
                  </div>
                  <span>Rs {Math.round(item.amount).toLocaleString()}</span>
                </div>
              ))}
              <Button type="primary" onClick={processRecurringDue}>
                Process Auto Due Purchases
              </Button>
            </div>
          ) : (
            <p className="empty-hint">No due recurring supplier entries right now.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
};

export default Dashboard;


