import React, { useMemo, useState } from 'react';
import { Button, InputNumber, Select, Space, Table, Tag } from 'antd';

const getStockState = (stockQty, reorderPoint = 10) => {
  const qty = Number(stockQty || 0);
  const reorder = Math.max(Number(reorderPoint) || 0, 0);
  if (qty <= 0) return { label: 'Out of Stock', color: 'red' };
  if (qty < reorder) return { label: 'Low Stock', color: 'gold' };
  return { label: 'In Stock', color: 'green' };
};

const getExpiryState = (expiryDate) => {
  if (!expiryDate) return { label: 'No Expiry', color: 'default', order: 4 };
  const now = new Date();
  const target = new Date(expiryDate);
  if (Number.isNaN(target.getTime())) return { label: 'Invalid Date', color: 'red', order: 0 };
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return { label: 'Expired', color: 'red', order: 0 };
  if (diffDays <= 60) return { label: `Expiring in ${diffDays}d`, color: 'volcano', order: 1 };
  if (diffDays <= 90) return { label: `Near Expiry (${diffDays}d)`, color: 'orange', order: 2 };
  return { label: 'Fresh', color: 'green', order: 3 };
};

const InventoryTable = ({
  rows,
  onUpdateStock,
  onToggleActive,
  onStockIn,
  onStockOut,
  onSetExpiryAction,
  onEdit,
  onDelete,
  canDeleteRecords,
  canWriteRecords = false,
  canManageStock = false
}) => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  const categoryOptions = useMemo(() => {
    const set = new Set();
    (rows || []).forEach((item) => {
      const category = String(item?.dosageForm || item?.category || '').trim();
      if (category) set.add(category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const supplierOptions = useMemo(() => {
    const set = new Set();
    (rows || []).forEach((item) => {
      const supplier = String(item?.manufacturer || '').trim();
      if (supplier) set.add(supplier);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(
    () =>
      (rows || []).filter((item) => {
        if (categoryFilter !== 'all') {
          const category = String(item?.dosageForm || item?.category || '').trim();
          if (category !== categoryFilter) return false;
        }
        if (supplierFilter !== 'all') {
          const supplier = String(item?.manufacturer || '').trim();
          if (supplier !== supplierFilter) return false;
        }
        return true;
      }),
    [rows, categoryFilter, supplierFilter]
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space wrap>
        <Select
          value={categoryFilter}
          style={{ minWidth: 180 }}
          onChange={setCategoryFilter}
          options={[{ value: 'all', label: 'All Categories' }, ...categoryOptions.map((value) => ({ value, label: value }))]}
        />
        <Select
          value={supplierFilter}
          style={{ minWidth: 180 }}
          onChange={setSupplierFilter}
          options={[{ value: 'all', label: 'All Suppliers' }, ...supplierOptions.map((value) => ({ value, label: value }))]}
        />
      </Space>

      <Table
        rowKey="_id"
        dataSource={filteredRows}
        pagination={{ pageSize: 12 }}
        scroll={{ x: 1600 }}
        rowClassName={(row) => {
          const expiry = getExpiryState(row.expiryDate);
          const stock = getStockState(row.stockQty, row.reorderPoint);
          if (expiry.order === 0) return 'inventory-row-expired';
          if (stock.label === 'Low Stock' || stock.label === 'Out of Stock') return 'inventory-row-low';
          return '';
        }}
        columns={[
          { title: 'Medicine', dataIndex: 'name', key: 'name', fixed: 'left', width: 160 },
          { title: 'Generic', render: (_, row) => row.genericName || '-' },
          { title: 'Strength', render: (_, row) => row.strength || '-' },
          { title: 'SKU', render: (_, row) => row.sku || '-' },
          { title: 'Barcode', render: (_, row) => row.barcode || '-' },
          { title: 'Rack', render: (_, row) => row.rackLocation || '-' },
          { title: 'Batch', render: (_, row) => row.batchNumber || '-' },
          { title: 'Batches', render: (_, row) => (Array.isArray(row.batches) ? row.batches.length : row.batchNumber ? 1 : 0) },
          { title: 'Supplier', render: (_, row) => row.manufacturer || '-' },
          { title: 'Expiry', render: (_, row) => (row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '-') },
          { title: 'Expiry Alert', render: (_, row) => { const st = getExpiryState(row.expiryDate); return <Tag color={st.color}>{st.label}</Tag>; } },
          { title: 'Unit Price', render: (_, row) => `Rs.${Number(row.unitPrice || 0).toLocaleString()}` },
          {
            title: 'Stock Qty',
            render: (_, row) => (
              canManageStock ? (
                <InputNumber
                  min={0}
                  value={Number(row.stockQty || 0)}
                  onChange={(value) => {
                    if (!onUpdateStock) return;
                    onUpdateStock(row, Number(value || 0));
                  }}
                />
              ) : (
                <span>{Number(row.stockQty || 0)}</span>
              )
            )
          },
          { title: 'Reorder', render: (_, row) => Number(row.reorderPoint ?? 10) },
          { title: 'Rx', render: (_, row) => (row.prescriptionRequired ? 'Yes' : 'No') },
          { title: 'Class', render: (_, row) => String(row.regulatoryClass || 'none').replace('_', ' ') },
          {
            title: 'Expiry Action',
            render: (_, row) => {
              const status = String(row.expiryActionStatus || 'none');
              const labelMap = {
                none: 'None',
                return_to_supplier: 'Return',
                clearance: 'Clearance',
                quarantine: 'Quarantine',
                disposed: 'Disposed'
              };
              const colorMap = {
                none: 'default',
                return_to_supplier: 'purple',
                clearance: 'gold',
                quarantine: 'volcano',
                disposed: 'red'
              };
              return (
                <Tag color={colorMap[status] || 'default'}>
                  {labelMap[status] || status}
                </Tag>
              );
            }
          },
          { title: 'Status', render: (_, row) => { const st = getStockState(row.stockQty, row.reorderPoint); return <Tag color={st.color}>{st.label}</Tag>; } },
          {
            title: 'Active',
            render: (_, row) => (
              canWriteRecords ? (
                <Select
                  value={row.active !== false ? 'yes' : 'no'}
                  onChange={(value) => onToggleActive(row, value === 'yes')}
                  options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                />
              ) : (
                <Tag color={row.active !== false ? 'green' : 'default'}>{row.active !== false ? 'Yes' : 'No'}</Tag>
              )
            )
          },
          {
            title: 'Actions',
            fixed: 'right',
            width: 280,
            render: (_, row) => (
              <Space wrap>
                {canManageStock ? <Button onClick={() => onStockIn(row)}>Stock In</Button> : null}
                {canManageStock ? <Button onClick={() => onStockOut(row)}>Stock Out</Button> : null}
                {canManageStock && onSetExpiryAction ? <Button onClick={() => onSetExpiryAction(row)}>Expiry Action</Button> : null}
                {canWriteRecords ? <Button onClick={() => onEdit(row)}>Edit</Button> : null}
                {canDeleteRecords ? <Button danger onClick={() => onDelete(row._id)}>Delete</Button> : null}
              </Space>
            )
          }
        ]}
      />
    </Space>
  );
};

export default InventoryTable;
