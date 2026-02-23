import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, DatePicker, Empty, Input, InputNumber, Modal, Popconfirm, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import AppShell from '../components/AppShell';
import api from '../services/api';
import { useGlobalContext } from '../context/globalContext';
import { exportRowsToPDF, exportTableToXlsx } from '../utils/export';
import { getApiErrorMessage } from '../utils/apiError';

const toDateValue = (value) => (value ? dayjs(value) : null);

const createEmptyLine = () => ({
  medicineId: '',
  qty: 1,
  costRate: 0,
  batchNumber: '',
  expiryDate: ''
});

const Purchases = () => {
  const { Title, Text } = Typography;
  const { showToast } = useGlobalContext();
  const [loading, setLoading] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState({
    suppliersCount: 0,
    totalPurchases: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueOutstanding: 0,
    overdueInvoices: 0,
    paymentRatio: 0
  });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [paymentModal, setPaymentModal] = useState({ open: false, purchaseId: '', amount: '' });
  const [form, setForm] = useState({
    supplierName: '',
    supplierInvoiceNumber: '',
    purchaseDate: dayjs().format('YYYY-MM-DD'),
    amountPaid: 0,
    notes: '',
    items: [createEmptyLine()]
  });

  const loadData = async (options = {}) => {
    try {
      setLoading(true);
      const ledgerParams = {};
      if (String(options.supplier || '').trim()) ledgerParams.supplier = String(options.supplier || '').trim();
      if (String(options.startDate || '').trim()) ledgerParams.startDate = String(options.startDate || '').trim();
      if (String(options.endDate || '').trim()) ledgerParams.endDate = String(options.endDate || '').trim();
      const [medRes, purRes, ledgerRes] = await Promise.all([
        api.get('/v1/categories'),
        api.get('/v1/purchases'),
        api.get('/v1/purchases/supplier-ledger', { params: ledgerParams })
      ]);
      setMedicines(Array.isArray(medRes?.data) ? medRes.data : []);
      setPurchases(Array.isArray(purRes?.data) ? purRes.data : []);
      setLedger(Array.isArray(ledgerRes?.data?.suppliers) ? ledgerRes.data.suppliers : []);
      setLedgerSummary(ledgerRes?.data?.summary || {
        suppliersCount: 0,
        totalPurchases: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        overdueOutstanding: 0,
        overdueInvoices: 0,
        paymentRatio: 0
      });
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to load purchase data'), { type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData({
      supplier: supplierSearch,
      startDate: ledgerStartDate,
      endDate: ledgerEndDate
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const medicineOptions = useMemo(
    () =>
      medicines.map((item) => ({
        value: item._id,
        label: `${item.name} (${item.strength || '-'})`
      })),
    [medicines]
  );

  const subtotal = useMemo(
    () => form.items.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.costRate) || 0)), 0),
    [form.items]
  );
  const supplierOptions = useMemo(
    () => [...new Set((ledger || []).map((item) => String(item?.supplierName || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [ledger]
  );

  const updateLine = (index, patch) => {
    setForm((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], ...patch };
      return { ...prev, items: next };
    });
  };

  const addLine = () => setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyLine()] }));
  const removeLine = (index) =>
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  const createPurchase = async () => {
    const payload = {
      supplierName: form.supplierName.trim(),
      supplierInvoiceNumber: form.supplierInvoiceNumber.trim(),
      purchaseDate: form.purchaseDate,
      amountPaid: Number(form.amountPaid || 0),
      notes: form.notes,
      items: form.items.map((item) => ({
        medicineId: item.medicineId,
        qty: Number(item.qty || 0),
        costRate: Number(item.costRate || 0),
        batchNumber: String(item.batchNumber || '').trim(),
        expiryDate: item.expiryDate
      }))
    };
    try {
      await api.post('/v1/purchases', payload);
      showToast('Purchase order created', { type: 'success' });
      setForm({
        supplierName: '',
        supplierInvoiceNumber: '',
        purchaseDate: dayjs().format('YYYY-MM-DD'),
        amountPaid: 0,
        notes: '',
        items: [createEmptyLine()]
      });
      await loadData({
        supplier: supplierSearch,
        startDate: ledgerStartDate,
        endDate: ledgerEndDate
      });
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to create purchase'), { type: 'warning' });
    }
  };

  const receivePurchase = async (purchaseId) => {
    try {
      await api.post(`/v1/purchases/${purchaseId}/receive`);
      showToast('GRN received and stock updated', { type: 'success' });
      await loadData({
        supplier: supplierSearch,
        startDate: ledgerStartDate,
        endDate: ledgerEndDate
      });
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to receive purchase'), { type: 'warning' });
    }
  };

  const openAddPaymentModal = (purchaseId) => {
    setPaymentModal({ open: true, purchaseId, amount: '' });
  };

  const addPayment = async () => {
    const purchaseId = String(paymentModal.purchaseId || '');
    const amount = Number(paymentModal.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter valid positive amount', { type: 'warning' });
      return;
    }
    try {
      await api.post(`/v1/purchases/${purchaseId}/payment`, { amount });
      showToast('Payment updated', { type: 'success' });
      setPaymentModal({ open: false, purchaseId: '', amount: '' });
      await loadData({
        supplier: supplierSearch,
        startDate: ledgerStartDate,
        endDate: ledgerEndDate
      });
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to update payment'), { type: 'warning' });
    }
  };

  const applyLedgerFilters = async () => {
    await loadData({
      supplier: supplierSearch,
      startDate: ledgerStartDate,
      endDate: ledgerEndDate
    });
  };

  const clearLedgerFilters = async () => {
    setSupplierSearch('');
    setLedgerStartDate('');
    setLedgerEndDate('');
    await loadData();
  };

  const exportLedgerXlsx = () => {
    const headers = ['Supplier', 'Total Purchases', 'Total Paid', 'Outstanding'];
    const rows = ledger.map((row) => [
      row.supplierName || '-',
      Number(row.totalPurchases || 0).toFixed(2),
      Number(row.totalPaid || 0).toFixed(2),
      Number(row.outstanding || 0).toFixed(2)
    ]);
    exportTableToXlsx({
      headers,
      rows,
      filename: 'supplier-ledger.xlsx',
      sheetName: 'Supplier Ledger'
    });
  };

  const exportLedgerPdf = () => {
    const headers = ['Supplier', 'Total Purchases', 'Total Paid', 'Outstanding'];
    const rows = ledger.map((row) => [
      row.supplierName || '-',
      `Rs.${Math.round(Number(row.totalPurchases || 0)).toLocaleString()}`,
      `Rs.${Math.round(Number(row.totalPaid || 0)).toLocaleString()}`,
      `Rs.${Math.round(Number(row.outstanding || 0)).toLocaleString()}`
    ]);
    exportRowsToPDF({
      title: 'Supplier Ledger',
      headers,
      rows,
      filename: 'supplier-ledger.pdf'
    });
  };

  return (
    <AppShell title="Purchases & Supplier Ledger" subtitle="Create PO, receive GRN, and track supplier outstanding">
      {loading ? <Alert style={{ marginBottom: 12 }} type="info" showIcon message="Loading purchase data..." /> : null}

      <Card style={{ marginBottom: 12 }}>
        <Title level={4} style={{ marginTop: 0 }}>New Purchase Order</Title>
        <div className="form-grid cols-4 gap-bottom">
          <div className="form-field">
            <label>Supplier Name</label>
            <Input value={form.supplierName} onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Supplier Invoice</label>
            <Input value={form.supplierInvoiceNumber} onChange={(e) => setForm((p) => ({ ...p, supplierInvoiceNumber: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Purchase Date</label>
            <DatePicker
              style={{ width: '100%' }}
              value={toDateValue(form.purchaseDate)}
              onChange={(v) => setForm((p) => ({ ...p, purchaseDate: v ? v.format('YYYY-MM-DD') : '' }))}
            />
          </div>
          <div className="form-field">
            <label>Amount Paid</label>
            <InputNumber min={0} value={form.amountPaid} onChange={(v) => setForm((p) => ({ ...p, amountPaid: Number(v || 0) }))} style={{ width: '100%' }} />
          </div>
        </div>

        <Space direction="vertical" style={{ width: '100%' }}>
          {form.items.map((line, idx) => (
            <Card key={`line_${idx}`} size="small">
              <div className="form-grid cols-4">
                <div className="form-field">
                  <label>Medicine</label>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    value={line.medicineId || undefined}
                    options={medicineOptions}
                    onChange={(value) => updateLine(idx, { medicineId: value })}
                  />
                </div>
                <div className="form-field">
                  <label>Qty</label>
                  <InputNumber min={1} value={line.qty} onChange={(v) => updateLine(idx, { qty: Number(v || 1) })} style={{ width: '100%' }} />
                </div>
                <div className="form-field">
                  <label>Cost Rate</label>
                  <InputNumber min={0} value={line.costRate} onChange={(v) => updateLine(idx, { costRate: Number(v || 0) })} style={{ width: '100%' }} />
                </div>
                <div className="form-field">
                  <label>Batch Number</label>
                  <Input value={line.batchNumber} onChange={(e) => updateLine(idx, { batchNumber: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Expiry Date</label>
                  <DatePicker
                    style={{ width: '100%' }}
                    value={toDateValue(line.expiryDate)}
                    onChange={(v) => updateLine(idx, { expiryDate: v ? v.format('YYYY-MM-DD') : '' })}
                  />
                </div>
                <div className="form-field">
                  <label>Line Total</label>
                  <Input value={`Rs.${Math.round((Number(line.qty || 0) * Number(line.costRate || 0))).toLocaleString()}`} readOnly />
                </div>
                <div className="form-field align-end">
                  <Space>
                    <Button onClick={addLine}>Add Line</Button>
                    <Popconfirm title="Remove this line?" onConfirm={() => removeLine(idx)}>
                      <Button danger disabled={form.items.length === 1}>Remove</Button>
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            </Card>
          ))}
        </Space>

        <div className="goal-head" style={{ marginTop: 10 }}>
          <Text strong>PO Total: Rs.{Math.round(subtotal).toLocaleString()}</Text>
          <Button type="primary" onClick={createPurchase}>Create PO</Button>
        </div>
      </Card>

      <Card style={{ marginBottom: 12 }} title="Purchase Orders">
        {purchases.length ? (
          <Table
            rowKey="_id"
            dataSource={purchases}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: 'PO No', dataIndex: 'purchaseNumber', key: 'purchaseNumber' },
              { title: 'Supplier', dataIndex: 'supplierName', key: 'supplierName' },
              { title: 'Supplier Inv', dataIndex: 'supplierInvoiceNumber', key: 'supplierInvoiceNumber', render: (v) => v || '-' },
              { title: 'Date', key: 'purchaseDate', render: (_, row) => (row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString() : '-') },
              { title: 'Status', key: 'status', render: (_, row) => <Tag color={row.status === 'received' ? 'green' : 'blue'}>{String(row.status || '').toUpperCase()}</Tag> },
              { title: 'Payment', key: 'paymentStatus', render: (_, row) => <Tag color={row.paymentStatus === 'paid' ? 'green' : 'orange'}>{String(row.paymentStatus || '').toUpperCase()}</Tag> },
              { title: 'Subtotal', key: 'subtotal', render: (_, row) => `Rs.${Math.round(Number(row.subtotal || 0)).toLocaleString()}` },
              {
                title: 'Outstanding',
                key: 'outstanding',
                render: (_, row) => {
                  const out = Math.max(Number(row.subtotal || 0) - Number(row.amountPaid || 0), 0);
                  return `Rs.${Math.round(out).toLocaleString()}`;
                }
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, row) => (
                  <Space>
                    <Button disabled={row.status !== 'draft'} onClick={() => receivePurchase(row._id)}>Receive GRN</Button>
                    <Button onClick={() => openAddPaymentModal(row._id)}>Add Payment</Button>
                  </Space>
                )
              }
            ]}
          />
        ) : (
          <Empty description="No purchase orders yet." />
        )}
      </Card>

      <Card title="Supplier Ledger">
        <div className="form-grid cols-4 gap-bottom">
          <div className="form-field">
            <label>Supplier</label>
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              value={supplierSearch || undefined}
              onChange={(value) => setSupplierSearch(value || '')}
              options={supplierOptions.map((value) => ({ value, label: value }))}
              placeholder="All suppliers"
            />
          </div>
          <div className="form-field">
            <label>From Date</label>
            <DatePicker
              style={{ width: '100%' }}
              value={toDateValue(ledgerStartDate)}
              onChange={(value) => setLedgerStartDate(value ? value.format('YYYY-MM-DD') : '')}
            />
          </div>
          <div className="form-field">
            <label>To Date</label>
            <DatePicker
              style={{ width: '100%' }}
              value={toDateValue(ledgerEndDate)}
              onChange={(value) => setLedgerEndDate(value ? value.format('YYYY-MM-DD') : '')}
            />
          </div>
          <div className="form-field align-end">
            <Space wrap>
              <Button onClick={applyLedgerFilters}>Apply</Button>
              <Button onClick={clearLedgerFilters}>Clear</Button>
              <Button onClick={exportLedgerXlsx}>Export Excel</Button>
              <Button onClick={exportLedgerPdf}>Export PDF</Button>
            </Space>
          </div>
        </div>
        <div className="form-grid cols-4 gap-bottom">
          <Card size="small"><Statistic title="Suppliers" value={Number(ledgerSummary.suppliersCount || 0)} /></Card>
          <Card size="small"><Statistic title="Total Purchases" prefix="Rs." value={Number(ledgerSummary.totalPurchases || 0)} precision={2} /></Card>
          <Card size="small"><Statistic title="Outstanding" prefix="Rs." value={Number(ledgerSummary.totalOutstanding || 0)} precision={2} /></Card>
          <Card size="small"><Statistic title="Payment Ratio" suffix="%" value={Number(ledgerSummary.paymentRatio || 0)} precision={2} /></Card>
        </div>
        <div className="form-grid cols-2 gap-bottom">
          <Card size="small"><Statistic title="Overdue Outstanding (30+ days)" prefix="Rs." value={Number(ledgerSummary.overdueOutstanding || 0)} precision={2} /></Card>
          <Card size="small"><Statistic title="Overdue Invoices (30+ days)" value={Number(ledgerSummary.overdueInvoices || 0)} /></Card>
        </div>
        {ledger.length ? (
          <Table
            rowKey="supplierName"
            dataSource={ledger}
            pagination={{ pageSize: 8 }}
            expandable={{
              expandedRowRender: (row) => (
                <Table
                  rowKey="_id"
                  size="small"
                  pagination={false}
                  dataSource={row.entries || []}
                  columns={[
                    { title: 'PO', dataIndex: 'purchaseNumber', key: 'purchaseNumber' },
                    { title: 'Inv', dataIndex: 'supplierInvoiceNumber', key: 'supplierInvoiceNumber', render: (v) => v || '-' },
                    { title: 'Date', key: 'purchaseDate', render: (_, r) => (r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString() : '-') },
                    { title: 'Status', key: 'status', render: (_, r) => String(r.status || '').toUpperCase() },
                    { title: 'Subtotal', key: 'subtotal', render: (_, r) => `Rs.${Math.round(Number(r.subtotal || 0)).toLocaleString()}` },
                    { title: 'Paid', key: 'amountPaid', render: (_, r) => `Rs.${Math.round(Number(r.amountPaid || 0)).toLocaleString()}` },
                    { title: 'Outstanding', key: 'outstanding', render: (_, r) => `Rs.${Math.round(Number(r.outstanding || 0)).toLocaleString()}` }
                  ]}
                />
              )
            }}
            columns={[
              { title: 'Supplier', dataIndex: 'supplierName', key: 'supplierName' },
              { title: 'Total Purchase', key: 'totalPurchases', render: (_, row) => `Rs.${Math.round(Number(row.totalPurchases || 0)).toLocaleString()}` },
              { title: 'Total Paid', key: 'totalPaid', render: (_, row) => `Rs.${Math.round(Number(row.totalPaid || 0)).toLocaleString()}` },
              { title: 'Outstanding', key: 'outstanding', render: (_, row) => <Tag color={Number(row.outstanding || 0) > 0 ? 'volcano' : 'green'}>Rs.{Math.round(Number(row.outstanding || 0)).toLocaleString()}</Tag> }
            ]}
          />
        ) : (
          <Empty description="No supplier ledger entries yet." />
        )}
      </Card>

      <Modal
        open={paymentModal.open}
        title="Add Supplier Payment"
        onCancel={() => setPaymentModal({ open: false, purchaseId: '', amount: '' })}
        onOk={addPayment}
        okText="Save Payment"
      >
        <div className="form-field">
          <label>Amount</label>
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            value={paymentModal.amount}
            onChange={(value) => setPaymentModal((prev) => ({ ...prev, amount: value ?? '' }))}
          />
        </div>
      </Modal>
    </AppShell>
  );
};

export default Purchases;
