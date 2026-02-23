import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, DatePicker, Input, Progress, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import ChartCard from '../components/ui/ChartCard';
import SkeletonTable from '../components/ui/SkeletonTable';
const SalesHistory = () => {
  const { Title, Text } = Typography;
  const {
    error,
    transactionHistoryItems,
    transactionHistoryPagination,
    transactionHistoryLoading,
    categories,
    transactions,
    getData,
    getTransactionHistory
  } = useGlobalContext();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    await getTransactionHistory({
      page,
      limit: 8,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search.trim() || undefined,
      category: category !== 'All' ? category : undefined
    });
  }, [category, endDate, getTransactionHistory, page, search, startDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setSearch(searchInput);
    }, 250);
    return () => clearTimeout(timerId);
  }, [searchInput]);

  useEffect(() => {
    getData();
  }, [getData]);

  const monthlyLimit = useMemo(
    () => categories.reduce((sum, item) => sum + Number(item.budget || 0), 0),
    [categories]
  );

  const thisMonthSpent = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((item) => {
        if ((item.type || 'outflow') === 'income') return false;
        const date = new Date(item.date);
        if (Number.isNaN(date.getTime())) return false;
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  const limitPercent = monthlyLimit > 0 ? Math.min((thisMonthSpent / monthlyLimit) * 100, 100) : 0;

  const chartData = useMemo(() => {
    const now = new Date();
    const totalsByDay = new Map();
    transactions.forEach((item) => {
      if ((item.type || 'outflow') === 'income') return;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return;
      const day = date.getDate();
      totalsByDay.set(day, (totalsByDay.get(day) || 0) + Number(item.amount || 0));
    });
    return Array.from(totalsByDay.keys()).sort((a, b) => a - b).map((day) => ({
      day,
      amount: totalsByDay.get(day)
    }));
  }, [transactions]);

  const rightPanel = (
    <>
      <Card>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>Procurement Limits</Title>
          <Text type="secondary">Monthly purchase cap</Text>
          <Title level={3} style={{ margin: 0 }}>Rs.{Math.round(monthlyLimit).toLocaleString()}</Title>
          <Text type="secondary">{limitPercent.toFixed(1)}%</Text>
          <Progress percent={Number(limitPercent.toFixed(1))} />
        </Space>
      </Card>

      <ChartCard title="Purchases this month">
        <div className="chart-box h-210">
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#64748b"
                fill="#e2e8f0"
                fillOpacity={0.8}
                strokeWidth={1.4}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </>
  );

  const columns = useMemo(() => ([
    { title: 'Entry', dataIndex: 'title', key: 'title' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    {
      title: 'Date',
      key: 'date',
      render: (_, row) => new Date(row.date).toLocaleString()
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_, row) => (
        <span className={(row.type || 'outflow') === 'income' ? 'amount-income' : 'amount-outflow'}>
          {(row.type || 'outflow') === 'income' ? '+' : '-'}Rs {Number(row.amount || 0).toLocaleString()}
        </span>
      )
    }
  ]), []);

  return (
    <AppShell
      title="Sales & Purchase History"
      subtitle="Filter, review, and monitor pharmacy entries"
      rightPanel={rightPanel}
    >
      {transactionHistoryLoading ? <Alert style={{ marginBottom: 16 }} type="info" showIcon message="Loading pharmacy entries..." /> : null}
      {error ? <Alert style={{ marginBottom: 16 }} type="error" showIcon message={error} /> : null}

      <Card>
        <Space wrap style={{ marginBottom: 12 }}>
          <Input
            placeholder="Search pharmacy entries..."
            value={searchInput}
            onChange={(e) => {
              setPage(1);
              setSearchInput(e.target.value);
            }}
            style={{ width: 260 }}
            allowClear
          />
          <DatePicker
            placeholder="Start date"
            value={startDate ? dayjs(startDate) : null}
            onChange={(value) => {
              setPage(1);
              setStartDate(value ? value.format('YYYY-MM-DD') : '');
            }}
          />
          <DatePicker
            placeholder="End date"
            value={endDate ? dayjs(endDate) : null}
            onChange={(value) => {
              setPage(1);
              setEndDate(value ? value.format('YYYY-MM-DD') : '');
            }}
          />
          <Select
            value={category}
            style={{ width: 200 }}
            onChange={(value) => {
              setPage(1);
              setCategory(value);
            }}
            options={[{ value: 'All', label: 'All' }, ...categories.map((item) => ({ value: item.name, label: item.name }))]}
          />
          <Button onClick={() => { setPage(1); setSearch(''); setSearchInput(''); setStartDate(''); setEndDate(''); setCategory('All'); }}>Clear filter</Button>
        </Space>

        {transactionHistoryLoading ? <SkeletonTable rows={8} cols={4} /> : null}
        {!transactionHistoryLoading ? (
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={transactionHistoryItems}
            pagination={false}
            locale={{
              emptyText: 'No entries found. Try a different filter or add your first pharmacy entry.'
            }}
          />
        ) : null}
        <Space style={{ marginTop: 12 }}>
          <Text type="secondary">Server page {transactionHistoryPagination.page} of {transactionHistoryPagination.totalPages}</Text>
          <Button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>Prev server page</Button>
          <Button onClick={() => setPage((p) => Math.min(p + 1, transactionHistoryPagination.totalPages))} disabled={page >= transactionHistoryPagination.totalPages}>Next server page</Button>
        </Space>
      </Card>
    </AppShell>
  );
};

export default SalesHistory;

