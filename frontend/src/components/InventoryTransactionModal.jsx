import React, { useMemo, useState } from 'react';
import { Alert, Button, Checkbox, DatePicker, Form, Input, InputNumber, Modal, Select, Space } from 'antd';
import dayjs from 'dayjs';
import { useGlobalContext } from '../context/globalContext';

const EXPENSE_CATEGORY_FALLBACK = ['Medicine Procurement', 'Supplier Payments', 'Utilities', 'Staff Salaries', 'Rent', 'Equipment', 'Packaging', 'Other'];
const INCOME_CATEGORY_FALLBACK = ['Retail Sales', 'Online Orders', 'Insurance Claims', 'Clinic Supplies', 'Wholesale'];

const InventoryTransactionModal = ({ isOpen, onClose, onSuccess }) => {
  const { categories, addTransaction, error, setError, showToast } = useGlobalContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'outflow',
    title: '',
    amount: '',
    category: 'Medicine Procurement',
    description: '',
    date: new Date().toISOString().split('T')[0],
    recurringEnabled: false,
    recurringFrequency: 'monthly',
    recurringAutoCreate: false
  });

  const categoryOptions = useMemo(() => {
    const defaultOptions = form.type === 'income' ? INCOME_CATEGORY_FALLBACK : EXPENSE_CATEGORY_FALLBACK;
    const available = categories.map((c) => c.name).filter((name) => {
      const lower = name.toLowerCase();
      if (form.type === 'income') {
        return ['retail sales', 'online orders', 'insurance claims', 'clinic supplies', 'wholesale'].includes(lower);
      }
      return !['retail sales', 'online orders', 'insurance claims', 'clinic supplies', 'wholesale'].includes(lower);
    });
    const merged = [...new Set([...available, ...defaultOptions])];
    return merged.length ? merged : defaultOptions;
  }, [categories, form.type]);

  const submit = async () => {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setIsSubmitting(true);
    const success = await addTransaction({
      type: form.type,
      title: form.title.trim(),
      amount,
      category: form.category,
      description: form.description.trim(),
      date: form.date,
      recurring: {
        enabled: form.recurringEnabled,
        frequency: form.recurringFrequency,
        autoCreate: form.recurringAutoCreate
      }
    });
    setIsSubmitting(false);
    if (!success) return;
    const signedAmount = `${form.type === 'income' ? '+' : '-'}Rs ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    showToast(`Successfully added "${form.title.trim()}" (${signedAmount})`, { type: 'success', duration: 2600 });
    if (onSuccess) onSuccess();
    onClose();
    setForm((prev) => ({
      ...prev,
      title: '',
      amount: '',
      description: '',
      recurringEnabled: false,
      recurringAutoCreate: false
    }));
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      onOk={submit}
      okText={isSubmitting ? 'Saving...' : `Add ${form.type === 'income' ? 'Sale' : 'Purchase'}`}
      okButtonProps={{ loading: isSubmitting }}
      destroyOnClose
      title="Add Transaction"
    >
      {error ? <Alert style={{ marginBottom: 12 }} type="error" message={error} showIcon /> : null}
      <Form layout="vertical">
        <Space style={{ width: '100%' }} size={8} wrap>
          <Select
            style={{ minWidth: 120 }}
            value={form.type}
            onChange={(type) => {
              const nextCategory = type === 'income' ? 'Retail Sales' : 'Medicine Procurement';
              setForm((p) => ({ ...p, type, category: nextCategory }));
            }}
            options={[
              { value: 'outflow', label: 'Purchase' },
              { value: 'income', label: 'Sale' }
            ]}
          />
          <Input
            style={{ minWidth: 260 }}
            placeholder={form.type === 'income' ? 'Sale title' : 'Purchase title'}
            value={form.title}
            onChange={(e) => {
              if (error) setError(null);
              setForm((p) => ({ ...p, title: e.target.value }));
            }}
          />
        </Space>

        <Form.Item label="Amount" style={{ marginTop: 12 }}>
          <InputNumber
            min={0.01}
            step={0.01}
            placeholder="0.00"
            style={{ width: '100%' }}
            value={form.amount}
            onChange={(value) => setForm((p) => ({ ...p, amount: value ?? '' }))}
          />
        </Form.Item>

        <Space style={{ width: '100%' }} size={8} wrap>
          <Select
            style={{ minWidth: 220 }}
            value={form.category}
            onChange={(value) => setForm((p) => ({ ...p, category: value }))}
            options={categoryOptions.map((name) => ({ value: name, label: name }))}
          />
          <DatePicker
            value={form.date ? dayjs(form.date) : null}
            onChange={(value) => setForm((p) => ({ ...p, date: value ? value.format('YYYY-MM-DD') : '' }))}
          />
        </Space>

        <Form.Item label="Description" style={{ marginTop: 12 }}>
          <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </Form.Item>

        {form.type === 'outflow' ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Checkbox
              checked={form.recurringEnabled}
              onChange={(e) => setForm((p) => ({ ...p, recurringEnabled: e.target.checked }))}
            >
              Recurring
            </Checkbox>
            <Checkbox
              checked={form.recurringAutoCreate}
              disabled={!form.recurringEnabled}
              onChange={(e) => setForm((p) => ({ ...p, recurringAutoCreate: e.target.checked }))}
            >
              Auto-create due purchase entries
            </Checkbox>
            <Select
              disabled={!form.recurringEnabled}
              value={form.recurringFrequency}
              onChange={(value) => setForm((p) => ({ ...p, recurringFrequency: value }))}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' }
              ]}
            />
          </Space>
        ) : null}

        <Button style={{ marginTop: 12 }} block onClick={onClose}>Cancel</Button>
      </Form>
    </Modal>
  );
};

export default InventoryTransactionModal;

