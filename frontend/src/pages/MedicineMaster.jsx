import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AutoComplete, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import AppShell from '../components/AppShell';
import SKUGeneratorModal from '../components/modules/inventory/SKUGeneratorModal';
import { useGlobalContext } from '../context/globalContext';
import { MASTER_MEDICINES } from '../data/masterMedicines';
import { NLEM_2016_MEDICINES } from '../data/nlem2016Library';
import { ACTIONS, hasPermission, normalizeRole } from '../config/rbacPolicy';

const emptyMedicine = {
  name: '',
  genericName: '',
  strength: '',
  sku: '',
  barcode: '',
  rackLocation: '',
  batchNumber: '',
  manufacturer: '',
  unitPrice: 0,
  stockQty: 0,
  reorderPoint: 10,
  prescriptionRequired: false,
  regulatoryClass: 'none',
  expiryDate: ''
};

const MedicineMaster = () => {
  const { Title, Text } = Typography;
  const {
    user,
    loading,
    error,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    getData,
    showToast
  } = useGlobalContext();

  const [form, setForm] = useState(emptyMedicine);
  const [editingId, setEditingId] = useState(null);
  const [importingNlem, setImportingNlem] = useState(false);
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const role = normalizeRole(user?.role);
  const canWriteRecords = hasPermission(role, ACTIONS.MEDICINE_WRITE);
  const canDeleteRecords = hasPermission(role, ACTIONS.MEDICINE_DELETE);

  useEffect(() => {
    getData();
  }, [getData]);

  const medicines = useMemo(
    () => (Array.isArray(categories) ? [...categories] : []).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
    [categories]
  );
  const masterMedicineMap = useMemo(() => {
    const map = new Map();
    MASTER_MEDICINES.forEach((item) => {
      const key = String(item?.name || '').trim().toLowerCase();
      if (!key) return;
      map.set(key, item);
    });
    return map;
  }, []);
  const medicineSuggestions = useMemo(() => {
    const names = new Set(MASTER_MEDICINES.map((item) => String(item?.name || '').trim()).filter(Boolean));
    NLEM_2016_MEDICINES.forEach((item) => {
      const name = String(item?.name || '').trim();
      if (name) names.add(name);
    });
    medicines.forEach((item) => {
      const name = String(item?.name || '').trim();
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [medicines]);

  const importNlemLibrary = async () => {
    if (!canWriteRecords) {
      showToast('You do not have permission to import medicines', { type: 'warning' });
      return;
    }
    Modal.confirm({
      title: 'Import Nepal NLEM 2016 library into Medicine Master?',
      content: 'Only missing medicines will be added.',
      onOk: async () => {
        const existingNames = new Set(medicines.map((item) => String(item?.name || '').trim().toLowerCase()).filter(Boolean));
        try {
          setImportingNlem(true);
          let added = 0;
          let skipped = 0;
          let failed = 0;

          for (const item of NLEM_2016_MEDICINES) {
            const key = String(item?.name || '').trim().toLowerCase();
            if (!key || existingNames.has(key)) {
              skipped += 1;
              continue;
            }
            // eslint-disable-next-line no-await-in-loop
            const ok = await addCategory({
              name: item.name,
              genericName: item.genericName,
              strength: item.strength,
              manufacturer: item.manufacturer,
              unitPrice: 0,
              stockQty: 0,
              reorderPoint: 10,
              prescriptionRequired: false,
              regulatoryClass: 'none',
              active: true
            });
            if (ok) {
              added += 1;
              existingNames.add(key);
            } else {
              failed += 1;
            }
          }

          await getData({ force: true });
          showToast(`NLEM import complete: added ${added}, skipped ${skipped}, failed ${failed}`, {
            type: failed > 0 ? 'warning' : 'success',
            duration: 5000
          });
        } finally {
          setImportingNlem(false);
        }
      }
    });
  };

  const onMedicineNameChange = (value) => {
    const name = String(value || '');
    const picked = masterMedicineMap.get(name.trim().toLowerCase());
    setForm((prev) => ({
      ...prev,
      name,
      genericName: picked?.genericName || prev.genericName,
      strength: picked?.strength || prev.strength,
      manufacturer: picked?.manufacturer || prev.manufacturer
    }));
  };

  const onSubmit = async () => {
    if (!canWriteRecords) {
      showToast('You do not have permission to manage medicine records', { type: 'warning' });
      return;
    }
    const basePayload = {
      name: String(form.name || '').trim(),
      genericName: String(form.genericName || '').trim(),
      strength: String(form.strength || '').trim(),
      sku: String(form.sku || '').trim(),
      barcode: String(form.barcode || '').trim(),
      rackLocation: String(form.rackLocation || '').trim(),
      manufacturer: String(form.manufacturer || '').trim(),
      unitPrice: Number(form.unitPrice) || 0,
      reorderPoint: Math.max(Number(form.reorderPoint) || 0, 0),
      prescriptionRequired: Boolean(form.prescriptionRequired),
      regulatoryClass: String(form.regulatoryClass || 'none'),
      active: true
    };
    const payload = editingId
      ? basePayload
      : {
          ...basePayload,
          batchNumber: String(form.batchNumber || '').trim(),
          stockQty: Number(form.stockQty) || 0,
          expiryDate: form.expiryDate || null
        };
    if (!payload.name) return;

    const success = editingId
      ? (await updateCategory(editingId, payload))?.success
      : await addCategory(payload);
    if (!success) return;

    setEditingId(null);
    setForm(emptyMedicine);
    await getData({ force: true });
  };

  const onEdit = (item) => {
    if (!canWriteRecords) {
      showToast('You do not have permission to edit medicine records', { type: 'warning' });
      return;
    }
    setEditingId(item._id);
    setForm({
      name: item.name || '',
      genericName: item.genericName || '',
      strength: item.strength || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      rackLocation: item.rackLocation || '',
      batchNumber: item.batchNumber || '',
      manufacturer: item.manufacturer || '',
      unitPrice: Number(item.unitPrice || 0),
      stockQty: Number(item.stockQty || 0),
      reorderPoint: Number(item.reorderPoint ?? 10),
      prescriptionRequired: Boolean(item.prescriptionRequired),
      regulatoryClass: String(item.regulatoryClass || 'none'),
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : ''
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

  return (
    <AppShell title="Medicine Master" subtitle="Create and manage medicine catalog metadata">
      {loading ? <Alert style={{ marginBottom: 16 }} type="info" showIcon message="Loading medicine data..." /> : null}
      {error ? <Alert style={{ marginBottom: 16 }} type="error" showIcon message={error} /> : null}

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Title level={4} style={{ margin: 0 }}>{editingId ? 'Edit Medicine' : 'Create Medicine'}</Title>
            <Button onClick={importNlemLibrary} loading={importingNlem} disabled={Boolean(editingId) || !canWriteRecords}>
              Import DDA/NLEM Library
            </Button>
          </Space>
          <Text type="secondary">
            NLEM library includes legal essential medicine names with strength/form from Nepal NLEM 2016.
          </Text>
          {editingId ? <Text type="secondary">Batch, stock, and expiry are managed via Stock-In/Stock-Out.</Text> : null}

          <Form layout="vertical" onFinish={onSubmit} disabled={!canWriteRecords}>
            <Row gutter={12}>
              <Col xs={24} md={6}>
                <Form.Item label="Medicine Name" required>
                  <AutoComplete
                    options={medicineSuggestions.map((name) => ({ value: name }))}
                    value={form.name}
                    onChange={onMedicineNameChange}
                    placeholder="Type brand/generic name"
                    filterOption={(inputValue, option) => option?.value?.toLowerCase().includes(inputValue.toLowerCase())}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}><Form.Item label="Generic Name"><Input value={form.genericName} onChange={(e) => setForm((p) => ({ ...p, genericName: e.target.value }))} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item label="Strength"><Input value={form.strength} onChange={(e) => setForm((p) => ({ ...p, strength: e.target.value }))} /></Form.Item></Col>
              <Col xs={24} md={6}>
                <Form.Item label="SKU">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
                    <Button onClick={() => setSkuModalOpen(true)} disabled={!canWriteRecords}>Generate</Button>
                  </Space.Compact>
                </Form.Item>
              </Col>

              <Col xs={24} md={6}><Form.Item label="Barcode"><Input value={form.barcode} onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item label="Rack Location"><Input value={form.rackLocation} onChange={(e) => setForm((p) => ({ ...p, rackLocation: e.target.value }))} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item label="Batch No."><Input value={form.batchNumber} onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))} disabled={Boolean(editingId)} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item label="Manufacturer"><Input value={form.manufacturer} onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))} /></Form.Item></Col>

              <Col xs={24} md={6}><Form.Item label="Unit Price (Rs)"><InputNumber min={0} step={0.01} style={{ width: '100%' }} value={form.unitPrice} onChange={(value) => setForm((p) => ({ ...p, unitPrice: value ?? 0 }))} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item label="Stock Qty"><InputNumber min={0} step={1} style={{ width: '100%' }} value={form.stockQty} onChange={(value) => setForm((p) => ({ ...p, stockQty: value ?? 0 }))} disabled={Boolean(editingId)} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item label="Reorder Point"><InputNumber min={0} step={1} style={{ width: '100%' }} value={form.reorderPoint} onChange={(value) => setForm((p) => ({ ...p, reorderPoint: value ?? 0 }))} /></Form.Item></Col>
              <Col xs={24} md={6}>
                <Form.Item label="Prescription Required">
                  <Select
                    value={form.prescriptionRequired ? 'yes' : 'no'}
                    onChange={(value) => setForm((p) => ({ ...p, prescriptionRequired: value === 'yes' }))}
                    options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="Regulatory Class">
                  <Select
                    value={form.regulatoryClass}
                    onChange={(value) => setForm((p) => ({ ...p, regulatoryClass: value }))}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'schedule_h', label: 'Schedule H' },
                      { value: 'narcotic', label: 'Narcotic' },
                      { value: 'psychotropic', label: 'Psychotropic' },
                      { value: 'other', label: 'Other' }
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="Expiry Date">
                  <DatePicker
                    style={{ width: '100%' }}
                    value={form.expiryDate ? dayjs(form.expiryDate) : null}
                    onChange={(value) => setForm((p) => ({ ...p, expiryDate: value ? value.format('YYYY-MM-DD') : '' }))}
                    disabled={Boolean(editingId)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Space>
              <Button type="primary" htmlType="submit" disabled={!canWriteRecords}>{editingId ? 'Update Medicine' : 'Add Medicine'}</Button>
              {editingId ? (
                <Button
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyMedicine);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </Space>
          </Form>
        </Space>
      </Card>

      <Card title="Medicine Master">
        <Table
          rowKey="_id"
          dataSource={medicines}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Medicine', dataIndex: 'name', key: 'name' },
            { title: 'Generic', render: (_, item) => item.genericName || '-' },
            { title: 'Strength', render: (_, item) => item.strength || '-' },
            { title: 'SKU', render: (_, item) => item.sku || '-' },
            { title: 'Barcode', render: (_, item) => item.barcode || '-' },
            { title: 'Rack', render: (_, item) => item.rackLocation || '-' },
            { title: 'Batch', render: (_, item) => item.batchNumber || '-' },
            { title: 'Manufacturer', render: (_, item) => item.manufacturer || '-' },
            { title: 'Expiry', render: (_, item) => (item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-') },
            { title: 'Unit Price', render: (_, item) => `Rs.${Number(item.unitPrice || 0).toLocaleString()}` },
            { title: 'Stock', render: (_, item) => Number(item.stockQty || 0) },
            { title: 'Reorder', render: (_, item) => Number(item.reorderPoint ?? 10) },
            { title: 'Rx', render: (_, item) => (item.prescriptionRequired ? <Tag color="volcano">Yes</Tag> : <Tag>No</Tag>) },
            { title: 'Class', render: (_, item) => String(item.regulatoryClass || 'none').replace('_', ' ') },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, item) => (
                <Space>
                  <Button onClick={() => onEdit(item)} disabled={!canWriteRecords}>Edit</Button>
                  {canDeleteRecords ? <Button danger onClick={() => onDelete(item._id)}>Delete</Button> : null}
                </Space>
              )
            }
          ]}
        />
      </Card>
      <SKUGeneratorModal
        open={skuModalOpen}
        onClose={() => setSkuModalOpen(false)}
        onApply={(sku) => setForm((prev) => ({ ...prev, sku }))}
      />
    </AppShell>
  );
};

export default MedicineMaster;
