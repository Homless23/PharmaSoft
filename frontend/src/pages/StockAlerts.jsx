import React, { useEffect, useMemo } from 'react';
import { Alert, Card, Empty, Space, Table, Tag, Typography } from 'antd';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';

const StockAlerts = () => {
  const { Title } = Typography;
  const { loading, error, categories, getData } = useGlobalContext();

  useEffect(() => {
    getData({ force: true });
  }, [getData]);

  const rows = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);
  const now = Date.now();

  const outOfStockRows = useMemo(
    () => rows.filter((item) => Number(item?.stockQty || 0) <= 0),
    [rows]
  );

  const expiredRows = useMemo(
    () =>
      rows.filter((item) => {
        if (!item?.expiryDate) return false;
        const ts = new Date(item.expiryDate).getTime();
        return !Number.isNaN(ts) && ts < now;
      }),
    [rows, now]
  );

  return (
    <AppShell title="Expiry & Low Stock Alerts" subtitle="Action queues for near-expiry, expired, and low stock medicines">
      {loading ? <Alert style={{ marginBottom: 12 }} type="info" showIcon message="Loading stock alerts..." /> : null}
      {error ? <Alert style={{ marginBottom: 12 }} type="error" showIcon message={error} /> : null}

      <Card style={{ marginBottom: 12 }}>
        <Title level={4} style={{ marginTop: 0 }}>Out of Stock</Title>
        {outOfStockRows.length ? (
          <Table
            rowKey="_id"
            dataSource={outOfStockRows}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: 'Medicine', dataIndex: 'name', key: 'name' },
              { title: 'Generic', key: 'genericName', render: (_, row) => row.genericName || '-' },
              { title: 'Strength', key: 'strength', render: (_, row) => row.strength || '-' },
              { title: 'Supplier', key: 'manufacturer', render: (_, row) => row.manufacturer || '-' },
              { title: 'Reorder Point', key: 'reorderPoint', render: (_, row) => Number(row.reorderPoint ?? 10) },
              { title: 'Status', key: 'status', render: () => <Tag color="red">OUT OF STOCK</Tag> }
            ]}
          />
        ) : (
          <Empty description="No out-of-stock medicines." />
        )}
      </Card>

      <Card>
        <Title level={4} style={{ marginTop: 0 }}>Expired Medicines</Title>
        {expiredRows.length ? (
          <Table
            rowKey="_id"
            dataSource={expiredRows}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: 'Medicine', dataIndex: 'name', key: 'name' },
              { title: 'Batch', key: 'batchNumber', render: (_, row) => row.batchNumber || '-' },
              { title: 'Expiry', key: 'expiryDate', render: (_, row) => (row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '-') },
              { title: 'Stock Qty', key: 'stockQty', render: (_, row) => Number(row.stockQty || 0) },
              {
                title: 'Expiry Action',
                key: 'expiryActionStatus',
                render: (_, row) => {
                  const status = String(row.expiryActionStatus || 'none').toLowerCase();
                  const map = {
                    none: { label: 'NONE', color: 'default' },
                    return_to_supplier: { label: 'RETURN', color: 'purple' },
                    clearance: { label: 'CLEARANCE', color: 'gold' },
                    quarantine: { label: 'QUARANTINE', color: 'volcano' },
                    disposed: { label: 'DISPOSED', color: 'red' }
                  };
                  const current = map[status] || map.none;
                  return (
                    <Space direction="vertical" size={0}>
                      <Tag color={current.color}>{current.label}</Tag>
                      {row.expiryActionNote ? <small>{row.expiryActionNote}</small> : null}
                    </Space>
                  );
                }
              }
            ]}
          />
        ) : (
          <Empty description="No expired medicines." />
        )}
      </Card>
    </AppShell>
  );
};

export default StockAlerts;
