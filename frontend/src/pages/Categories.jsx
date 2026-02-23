import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card, DatePicker, Input, InputNumber, Modal, Select, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import InventoryTable from '../components/modules/inventory/InventoryTable';
import BarcodeScannerInput from '../components/modules/inventory/BarcodeScannerInput';
import SupplierPerformanceDashboard from '../components/modules/profiles/SupplierPerformanceDashboard';
import AddressBookForm from '../components/modules/profiles/AddressBookForm';
import { useGlobalContext } from '../context/globalContext';
import api from '../services/api';
import { ACTIONS, hasPermission, normalizeRole } from '../config/rbacPolicy';
import { getApiErrorMessage } from '../utils/apiError';

const Categories = () => {
  const { Title } = Typography;
  const {
    user,
    loading,
    error,
    categories,
    createTransaction,
    updateCategory,
    deleteCategory,
    getData,
    showToast
  } = useGlobalContext();

  const [query, setQuery] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [editModal, setEditModal] = useState({
    open: false,
    rowId: '',
    unitPrice: 0,
    reorderPoint: 10,
    manufacturer: '',
    rackLocation: '',
    barcode: '',
    prescriptionRequired: 'no',
    regulatoryClass: 'none'
  });
  const [stockInModal, setStockInModal] = useState({
    open: false,
    rowId: '',
    medicineName: '',
    qty: 1,
    batchNumber: '',
    expiryDate: ''
  });
  const [stockOutModal, setStockOutModal] = useState({
    open: false,
    rowId: '',
    medicineName: '',
    qty: 1,
    currentStock: 0
  });
  const [expiryActionModal, setExpiryActionModal] = useState({
    open: false,
    rowId: '',
    medicineName: '',
    status: 'none',
    note: ''
  });
  const stockInValidationMessage = useMemo(() => {
    const qty = Math.floor(Number(stockInModal.qty || 0));
    if (!Number.isFinite(qty) || qty <= 0) return 'Quantity must be greater than 0';
    if (!String(stockInModal.batchNumber || '').trim()) return 'Batch number is required';
    if (!String(stockInModal.expiryDate || '').trim()) return 'Expiry date is required';
    return '';
  }, [stockInModal.batchNumber, stockInModal.expiryDate, stockInModal.qty]);
  const stockOutValidationMessage = useMemo(() => {
    const qty = Math.floor(Number(stockOutModal.qty || 0));
    if (!Number.isFinite(qty) || qty <= 0) return 'Quantity must be greater than 0';
    if (qty > Number(stockOutModal.currentStock || 0)) return 'Quantity cannot exceed current stock';
    return '';
  }, [stockOutModal.currentStock, stockOutModal.qty]);
  const role = normalizeRole(user?.role);
  const canWriteRecords = hasPermission(role, ACTIONS.MEDICINE_WRITE);
  const canManageStock = hasPermission(role, ACTIONS.STOCK_MANAGE);
  const canDeleteRecords = hasPermission(normalizeRole(user?.role), ACTIONS.MEDICINE_DELETE);

  useEffect(() => {
    getData();
  }, [getData]);

  useEffect(() => {
    const q = String(searchParams.get('q') || '').trim();
    setQuery(q);
    setQueryInput(q);
  }, [searchParams]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      const next = String(queryInput || '').trim();
      setQuery(next);
      const nextParams = new URLSearchParams(searchParams);
      if (!next) {
        nextParams.delete('q');
      } else {
        nextParams.set('q', next);
      }
      setSearchParams(nextParams, { replace: true });
    }, 250);
    return () => clearTimeout(timerId);
  }, [queryInput, searchParams, setSearchParams]);

  const rows = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    const source = Array.isArray(categories) ? categories : [];
    return source
      .filter((item) => {
        if (!q) return true;
        const text = [
          item?.name,
          item?.genericName,
          item?.strength,
          item?.sku,
          item?.barcode,
          item?.rackLocation,
          item?.regulatoryClass,
          item?.batchNumber,
          item?.manufacturer
        ].join(' ').toLowerCase();
        return text.includes(q);
      })
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [categories, query]);

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

  const expirySummary = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const state = getExpiryState(row.expiryDate);
          if (state.order === 0) acc.expired += 1;
          if (state.order === 1 || state.order === 2) acc.nearExpiry += 1;
          return acc;
        },
        { expired: 0, nearExpiry: 0 }
      ),
    [rows]
  );

  const onToggleActive = async (item, active) => {
    if (!canWriteRecords) {
      showToast('You do not have permission to modify medicine status', { type: 'warning' });
      return;
    }
    await updateCategory(item._id, { active: Boolean(active) });
    await getData({ force: true });
  };

  const onUpdateStock = async (item, stockQty) => {
    if (!canManageStock) {
      showToast('You do not have permission to manage stock', { type: 'warning' });
      return;
    }
    await updateCategory(item._id, { stockQty: Math.max(Number(stockQty) || 0, 0) });
    await getData({ force: true });
  };

  const onEdit = (item) => {
    if (!canWriteRecords) {
      showToast('You do not have permission to edit medicine records', { type: 'warning' });
      return;
    }
    setEditModal({
      open: true,
      rowId: String(item?._id || ''),
      unitPrice: Number(item?.unitPrice || 0),
      reorderPoint: Number(item?.reorderPoint ?? 10),
      manufacturer: String(item?.manufacturer || ''),
      rackLocation: String(item?.rackLocation || ''),
      barcode: String(item?.barcode || ''),
      prescriptionRequired: item?.prescriptionRequired ? 'yes' : 'no',
      regulatoryClass: String(item?.regulatoryClass || 'none')
    });
  };

  const submitEdit = async () => {
    const rowId = String(editModal.rowId || '');
    if (!rowId) return;
    const result = await updateCategory(rowId, {
      unitPrice: Number(editModal.unitPrice) || 0,
      reorderPoint: Math.max(Number(editModal.reorderPoint) || 0, 0),
      manufacturer: String(editModal.manufacturer || '').trim(),
      rackLocation: String(editModal.rackLocation || '').trim(),
      barcode: String(editModal.barcode || '').trim(),
      prescriptionRequired: String(editModal.prescriptionRequired || '').trim().toLowerCase() === 'yes',
      regulatoryClass: String(editModal.regulatoryClass || 'none').trim().toLowerCase()
    });
    if (!result?.success) return;
    await getData({ force: true });
    setEditModal({
      open: false,
      rowId: '',
      unitPrice: 0,
      reorderPoint: 10,
      manufacturer: '',
      rackLocation: '',
      barcode: '',
      prescriptionRequired: 'no',
      regulatoryClass: 'none'
    });
  };

  const onDelete = async (id) => {
    if (!canDeleteRecords) {
      showToast('You do not have permission to delete records', { type: 'warning' });
      return;
    }
    Modal.confirm({
      title: 'Delete this medicine?',
      onOk: async () => {
        await deleteCategory(id);
        await getData({ force: true });
      }
    });
  };

  const onStockIn = (row) => {
    if (!canManageStock) {
      showToast('You do not have permission to manage stock', { type: 'warning' });
      return;
    }
    setStockInModal({
      open: true,
      rowId: String(row?._id || ''),
      medicineName: String(row?.name || ''),
      qty: 1,
      batchNumber: String(row?.batchNumber || ''),
      expiryDate: row?.expiryDate ? new Date(row.expiryDate).toISOString().slice(0, 10) : ''
    });
  };

  const submitStockIn = async () => {
    const qty = Math.floor(Number(stockInModal.qty || 0));
    const batchNumber = String(stockInModal.batchNumber || '').trim();
    const expiryDate = String(stockInModal.expiryDate || '').trim();
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Enter a valid positive quantity', { type: 'warning' });
      return;
    }
    if (!batchNumber) {
      showToast('Batch number is required for stock-in', { type: 'warning' });
      return;
    }
    if (!expiryDate) {
      showToast('Expiry date is required for stock-in', { type: 'warning' });
      return;
    }
    try {
      await api.post(`/v1/categories/${stockInModal.rowId}/stock-in`, {
        qty,
        batchNumber,
        expiryDate
      });
      await createTransaction({
        type: 'outflow',
        title: `Stock-In ${stockInModal.medicineName}`,
        amount: Number(
          (rows.find((item) => String(item?._id || '') === String(stockInModal.rowId || ''))?.unitPrice) || 0
        ) * qty,
        category: 'Medicine Procurement',
        description: `Shipment received: +${qty} units (${batchNumber})`,
        date: new Date().toISOString().slice(0, 10)
      });
      showToast('Stock updated successfully', { type: 'success' });
      setStockInModal({
        open: false,
        rowId: '',
        medicineName: '',
        qty: 1,
        batchNumber: '',
        expiryDate: ''
      });
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, 'Failed to stock in'), { type: 'warning' });
    }
    await getData({ force: true });
  };

  const onStockOut = (row) => {
    if (!canManageStock) {
      showToast('You do not have permission to manage stock', { type: 'warning' });
      return;
    }
    setStockOutModal({
      open: true,
      rowId: String(row?._id || ''),
      medicineName: String(row?.name || ''),
      qty: 1,
      currentStock: Number(row?.stockQty || 0)
    });
  };

  const submitStockOut = async () => {
    const qty = Math.floor(Number(stockOutModal.qty || 0));
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Enter a valid positive quantity', { type: 'warning' });
      return;
    }
    if (qty > Number(stockOutModal.currentStock || 0)) {
      showToast('Stock-Out quantity cannot exceed available stock', { type: 'warning' });
      return;
    }
    try {
      await api.post(`/v1/categories/${stockOutModal.rowId}/stock-out`, { qty });
      showToast('Stock updated successfully', { type: 'success' });
      setStockOutModal({
        open: false,
        rowId: '',
        medicineName: '',
        qty: 1,
        currentStock: 0
      });
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, 'Failed to stock out'), { type: 'warning' });
    }
    await getData({ force: true });
  };

  const onSetExpiryAction = (row) => {
    if (!canManageStock) {
      showToast('You do not have permission to manage stock', { type: 'warning' });
      return;
    }
    setExpiryActionModal({
      open: true,
      rowId: String(row?._id || ''),
      medicineName: String(row?.name || ''),
      status: String(row?.expiryActionStatus || 'none'),
      note: String(row?.expiryActionNote || '')
    });
  };

  const submitExpiryAction = async () => {
    const status = String(expiryActionModal.status || '').trim().toLowerCase();
    const note = String(expiryActionModal.note || '').trim();
    try {
      await api.post(`/v1/categories/${expiryActionModal.rowId}/expiry-action`, {
        status,
        note
      });
      showToast('Expiry action updated', { type: 'success' });
      setExpiryActionModal({
        open: false,
        rowId: '',
        medicineName: '',
        status: 'none',
        note: ''
      });
      await getData({ force: true });
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, 'Failed to update expiry action'), { type: 'warning' });
    }
  };

  return (
    <AppShell title="Inventory & Batches" subtitle="Track batch stock, expiry state, rack location, and pricing">
      {loading ? <Alert style={{ marginBottom: 16 }} type="info" showIcon message="Refreshing medicine info..." /> : null}
      {error ? <Alert style={{ marginBottom: 16 }} type="error" showIcon message={error} /> : null}

      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Title level={4} style={{ margin: 0 }}>Medicine Inventory Info</Title>
            <Space>
              <Tag color="orange">Near Expiry (90d): {expirySummary.nearExpiry}</Tag>
              <Tag color="red">Expired: {expirySummary.expired}</Tag>
              <Tag color="blue" onClick={() => setAddressBookOpen(true)} style={{ cursor: 'pointer' }}>
                Add Supplier/Patient
              </Tag>
            </Space>
            <Input
              placeholder="Search: name, barcode, rack, SKU, batch, manufacturer"
              value={queryInput}
              onChange={(e) => setQueryInput(String(e.target.value || ''))}
              style={{ width: 360, maxWidth: '100%' }}
            />
            <div style={{ minWidth: 320, flex: 1 }}>
              <BarcodeScannerInput
                onScan={(code) => setQueryInput(String(code || '').trim())}
                placeholder="Scan barcode to find item"
              />
            </div>
          </Space>

          <InventoryTable
            rows={rows}
            onUpdateStock={onUpdateStock}
            onToggleActive={onToggleActive}
            onStockIn={onStockIn}
            onStockOut={onStockOut}
            onSetExpiryAction={onSetExpiryAction}
            onEdit={onEdit}
            onDelete={onDelete}
            canDeleteRecords={canDeleteRecords}
            canWriteRecords={canWriteRecords}
            canManageStock={canManageStock}
          />

          <SupplierPerformanceDashboard rows={rows} />
        </Space>
      </Card>

      <AddressBookForm
        open={addressBookOpen}
        onClose={() => setAddressBookOpen(false)}
        onSave={() => showToast('Address book entry saved', { type: 'success' })}
      />
      <Modal
        open={editModal.open}
        title="Edit Medicine"
        okText="Save"
        onOk={submitEdit}
        onCancel={() => setEditModal((prev) => ({ ...prev, open: false }))}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <label>Unit Price</label>
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={editModal.unitPrice}
              onChange={(value) => setEditModal((prev) => ({ ...prev, unitPrice: Number(value || 0) }))}
            />
          </div>
          <div>
            <label>Reorder Point</label>
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={editModal.reorderPoint}
              onChange={(value) => setEditModal((prev) => ({ ...prev, reorderPoint: Number(value || 0) }))}
            />
          </div>
          <div>
            <label>Manufacturer</label>
            <Input
              value={editModal.manufacturer}
              onChange={(e) => setEditModal((prev) => ({ ...prev, manufacturer: e.target.value }))}
              onPressEnter={submitEdit}
            />
          </div>
          <div>
            <label>Rack Location</label>
            <Input
              value={editModal.rackLocation}
              onChange={(e) => setEditModal((prev) => ({ ...prev, rackLocation: e.target.value }))}
            />
          </div>
          <div>
            <label>Barcode</label>
            <Input
              value={editModal.barcode}
              onChange={(e) => setEditModal((prev) => ({ ...prev, barcode: e.target.value }))}
              onPressEnter={submitEdit}
            />
          </div>
          <div>
            <label>Prescription Required</label>
            <Select
              value={editModal.prescriptionRequired}
              options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
              onChange={(value) => setEditModal((prev) => ({ ...prev, prescriptionRequired: value }))}
            />
          </div>
          <div>
            <label>Regulatory Class</label>
            <Select
              value={editModal.regulatoryClass}
              options={[
                { value: 'none', label: 'None' },
                { value: 'schedule_h', label: 'Schedule H' },
                { value: 'narcotic', label: 'Narcotic' },
                { value: 'psychotropic', label: 'Psychotropic' },
                { value: 'other', label: 'Other' }
              ]}
              onChange={(value) => setEditModal((prev) => ({ ...prev, regulatoryClass: value }))}
            />
          </div>
        </Space>
      </Modal>
      <Modal
        open={stockInModal.open}
        title={`Stock In${stockInModal.medicineName ? `: ${stockInModal.medicineName}` : ''}`}
        okText="Update Stock"
        onOk={submitStockIn}
        okButtonProps={{ disabled: Boolean(stockInValidationMessage) }}
        onCancel={() => setStockInModal((prev) => ({ ...prev, open: false }))}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <label>Quantity</label>
            <InputNumber
              min={1}
              step={1}
              style={{ width: '100%' }}
              value={stockInModal.qty}
              onChange={(value) => setStockInModal((prev) => ({ ...prev, qty: Number(value || 1) }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !stockInValidationMessage) submitStockIn();
              }}
            />
          </div>
          <div>
            <label>Batch Number</label>
            <Input
              value={stockInModal.batchNumber}
              onChange={(e) => setStockInModal((prev) => ({ ...prev, batchNumber: e.target.value }))}
              onPressEnter={() => {
                if (!stockInValidationMessage) submitStockIn();
              }}
            />
          </div>
          <div>
            <label>Expiry Date (YYYY-MM-DD)</label>
            <DatePicker
              style={{ width: '100%' }}
              value={stockInModal.expiryDate ? dayjs(stockInModal.expiryDate) : null}
              onChange={(value) => setStockInModal((prev) => ({ ...prev, expiryDate: value ? value.format('YYYY-MM-DD') : '' }))}
            />
          </div>
          {stockInValidationMessage ? <Typography.Text type="danger">{stockInValidationMessage}</Typography.Text> : null}
        </Space>
      </Modal>
      <Modal
        open={stockOutModal.open}
        title={`Stock Out${stockOutModal.medicineName ? `: ${stockOutModal.medicineName}` : ''}`}
        okText="Update Stock"
        onOk={submitStockOut}
        okButtonProps={{ disabled: Boolean(stockOutValidationMessage) }}
        onCancel={() => setStockOutModal((prev) => ({ ...prev, open: false }))}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>Current Stock: <strong>{Number(stockOutModal.currentStock || 0)}</strong></div>
          <div>
            <label>Quantity to remove</label>
            <InputNumber
              min={1}
              step={1}
              style={{ width: '100%' }}
              value={stockOutModal.qty}
              onChange={(value) => setStockOutModal((prev) => ({ ...prev, qty: Number(value || 1) }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !stockOutValidationMessage) submitStockOut();
              }}
            />
          </div>
          {stockOutValidationMessage ? <Typography.Text type="danger">{stockOutValidationMessage}</Typography.Text> : null}
        </Space>
      </Modal>
      <Modal
        open={expiryActionModal.open}
        title={`Expiry Action${expiryActionModal.medicineName ? `: ${expiryActionModal.medicineName}` : ''}`}
        okText="Save Action"
        onOk={submitExpiryAction}
        onCancel={() => setExpiryActionModal((prev) => ({ ...prev, open: false }))}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Alert
            type="warning"
            showIcon
            message="Expiry actions are safety-critical and are recorded in the audit trail."
          />
          <div>
            <label>Status</label>
            <Select
              value={expiryActionModal.status}
              options={[
                { value: 'none', label: 'None' },
                { value: 'return_to_supplier', label: 'Return to Supplier' },
                { value: 'clearance', label: 'Clearance' },
                { value: 'quarantine', label: 'Quarantine' },
                { value: 'disposed', label: 'Disposed' }
              ]}
              onChange={(value) => setExpiryActionModal((prev) => ({ ...prev, status: value }))}
            />
          </div>
          <div>
            <label>Action Note</label>
            <Input.TextArea
              rows={3}
              value={expiryActionModal.note}
              onChange={(e) => setExpiryActionModal((prev) => ({ ...prev, note: e.target.value }))}
            />
          </div>
        </Space>
      </Modal>
    </AppShell>
  );
};

export default Categories;

