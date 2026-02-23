import React, { useMemo, useState } from 'react';
import { Button, Card, Empty, Form, Input, List, Modal, Popconfirm, Select, Space, Steps, Tag, Typography } from 'antd';

const STORAGE_KEY = 'address_book_entries_v1';

const safeLoadEntries = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const AddressBookForm = ({ open, onClose, onSave }) => {
  const { Text } = Typography;
  const [step, setStep] = useState(0);
  const [entries, setEntries] = useState(safeLoadEntries());
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState('');
  const [entry, setEntry] = useState({
    type: 'supplier',
    name: '',
    phone: '',
    email: '',
    address: '',
    panOrLicense: '',
    notes: '',
    allergies: ''
  });

  const stepItems = useMemo(() => [
    { title: 'Type' },
    { title: 'Contact' },
    { title: 'Details' }
  ], []);

  const resetForm = () => {
    setStep(0);
    setEditingId('');
    setEntry({
      type: 'supplier',
      name: '',
      phone: '',
      email: '',
      address: '',
      panOrLicense: '',
      notes: '',
      allergies: ''
    });
  };

  const saveEntries = (nextEntries) => {
    setEntries(nextEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries.slice(0, 400)));
  };

  const persistEntry = () => {
    const basePayload = {
      ...entry,
      allergies: String(entry.allergies || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    };
    const payload = editingId
      ? { ...basePayload, _id: editingId }
      : { ...basePayload, _id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    const nextEntries = editingId
      ? entries.map((item) => (item._id === editingId ? payload : item))
      : [payload, ...entries];
    saveEntries(nextEntries);
    if (onSave) onSave(payload, nextEntries);
    resetForm();
  };

  const filteredEntries = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((item) => {
      const hay = [
        item?.type,
        item?.name,
        item?.phone,
        item?.email,
        item?.address,
        item?.panOrLicense,
        item?.notes,
        ...(Array.isArray(item?.allergies) ? item.allergies : [])
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query]);

  const startEdit = (item) => {
    setEditingId(item?._id || '');
    setEntry({
      type: item?.type || 'supplier',
      name: item?.name || '',
      phone: item?.phone || '',
      email: item?.email || '',
      address: item?.address || '',
      panOrLicense: item?.panOrLicense || '',
      notes: item?.notes || '',
      allergies: Array.isArray(item?.allergies) ? item.allergies.join(', ') : ''
    });
    setStep(0);
  };

  const deleteEntry = (id) => {
    const nextEntries = entries.filter((item) => item._id !== id);
    saveEntries(nextEntries);
    if (editingId && editingId === id) {
      resetForm();
    }
    if (onSave) onSave(null, nextEntries);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Address Book Form"
      width={720}
    >
      <Steps current={step} items={stepItems} style={{ marginBottom: 16 }} />
      <Card size="small">
        <Form layout="vertical">
          {step === 0 ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item label="Profile Type">
                <Select
                  value={entry.type}
                  onChange={(value) => setEntry((prev) => ({ ...prev, type: value }))}
                  options={[
                    { value: 'supplier', label: 'Supplier' },
                    { value: 'patient', label: 'Patient' }
                  ]}
                />
              </Form.Item>
              <Form.Item label={entry.type === 'supplier' ? 'Supplier Name' : 'Patient Name'}>
                <Input value={entry.name} onChange={(e) => setEntry((prev) => ({ ...prev, name: e.target.value }))} />
              </Form.Item>
            </Space>
          ) : null}

          {step === 1 ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item label="Phone">
                <Input value={entry.phone} onChange={(e) => setEntry((prev) => ({ ...prev, phone: e.target.value }))} />
              </Form.Item>
              <Form.Item label="Email">
                <Input value={entry.email} onChange={(e) => setEntry((prev) => ({ ...prev, email: e.target.value }))} />
              </Form.Item>
              <Form.Item label="Address">
                <Input value={entry.address} onChange={(e) => setEntry((prev) => ({ ...prev, address: e.target.value }))} />
              </Form.Item>
            </Space>
          ) : null}

          {step === 2 ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item label={entry.type === 'supplier' ? 'PAN / Registration' : 'License / ID'}>
                <Input value={entry.panOrLicense} onChange={(e) => setEntry((prev) => ({ ...prev, panOrLicense: e.target.value }))} />
              </Form.Item>
              {entry.type === 'patient' ? (
                <Form.Item label="Allergies (comma separated)">
                  <Input value={entry.allergies} onChange={(e) => setEntry((prev) => ({ ...prev, allergies: e.target.value }))} />
                </Form.Item>
              ) : null}
              <Form.Item label="Notes">
                <Input.TextArea rows={3} value={entry.notes} onChange={(e) => setEntry((prev) => ({ ...prev, notes: e.target.value }))} />
              </Form.Item>
              {entry.type === 'patient' && entry.allergies ? (
                <Space wrap>
                  {String(entry.allergies).split(',').map((item) => item.trim()).filter(Boolean).map((item) => (
                    <Tag key={item} color="volcano">{item}</Tag>
                  ))}
                </Space>
              ) : null}
            </Space>
          ) : null}
        </Form>
      </Card>

      <Space style={{ marginTop: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Button onClick={() => setStep((prev) => Math.max(prev - 1, 0))} disabled={step === 0}>Back</Button>
          <Button onClick={resetForm} disabled={!editingId && !entry.name && !entry.phone && !entry.email && !entry.address && !entry.notes}>
            Reset
          </Button>
        </Space>
        {step < stepItems.length - 1 ? (
          <Button type="primary" onClick={() => setStep((prev) => prev + 1)}>Next</Button>
        ) : (
          <Button
            type="primary"
            onClick={persistEntry}
            disabled={!String(entry.name || '').trim()}
          >
            {editingId ? 'Update Entry' : 'Save Entry'}
          </Button>
        )}
      </Space>

      <Card size="small" style={{ marginTop: 14 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text strong>Saved Profiles</Text>
            <Input
              placeholder="Search profiles"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: 260 }}
            />
          </Space>
          {filteredEntries.length ? (
            <List
              size="small"
              dataSource={filteredEntries.slice(0, 80)}
              renderItem={(item) => (
                <List.Item
                  key={item._id}
                  actions={[
                    <Button key="edit" type="link" onClick={() => startEdit(item)}>Edit</Button>,
                    <Popconfirm key="delete" title="Delete profile?" onConfirm={() => deleteEntry(item._id)}>
                      <Button type="link" danger>Delete</Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={(
                      <Space>
                        <Tag color={item.type === 'patient' ? 'volcano' : 'blue'}>
                          {String(item.type || '').toUpperCase()}
                        </Tag>
                        {item.name}
                      </Space>
                    )}
                    description={[
                      item.phone ? `Phone: ${item.phone}` : '',
                      item.email ? `Email: ${item.email}` : '',
                      item.type === 'patient' && Array.isArray(item.allergies) && item.allergies.length
                        ? `Allergies: ${item.allergies.join(', ')}`
                        : ''
                    ].filter(Boolean).join(' | ')}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No profiles yet" />
          )}
        </Space>
      </Card>
    </Modal>
  );
};

export default AddressBookForm;
