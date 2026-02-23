import React, { useState } from 'react';
import { Button, Card, DatePicker, Form, Input, InputNumber, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { useGlobalContext } from '../context/globalContext';

const CATEGORIES = ['OTC', 'Prescription', 'Supplements', 'Personal Care', 'Medical Devices', 'Other'];

const TransactionEntryForm = () => {
  const { createTransaction } = useGlobalContext();
  const { Title } = Typography;
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(null);
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setIsSubmitting(true);
    const success = await createTransaction({
      title: title.trim(),
      amount: parsedAmount,
      category,
      description: title.trim(),
      date
    });
    setIsSubmitting(false);
    if (!success) return;
    setTitle('');
    setAmount(null);
  };

  return (
    <Card style={{ maxWidth: 520, margin: '0 auto' }}>
      <Title level={4}>Add Ledger Entry</Title>
      <Form layout="vertical" onFinish={onSubmit}>
        <Form.Item label="Amount">
          <InputNumber
            min={0.01}
            step={0.01}
            style={{ width: '100%' }}
            value={amount}
            onChange={setAmount}
            placeholder="0"
          />
        </Form.Item>
        <Form.Item label="Description">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Supplier Purchase - Batch A12" />
        </Form.Item>
        <Form.Item label="Category">
          <Select value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </Form.Item>
        <Form.Item label="Date">
          <DatePicker
            style={{ width: '100%' }}
            value={date ? dayjs(date) : null}
            onChange={(value) => setDate(value ? value.format('YYYY-MM-DD') : '')}
          />
        </Form.Item>
        <Button htmlType="submit" type="primary" loading={isSubmitting} block>
          Add Entry
        </Button>
      </Form>
    </Card>
  );
};

export default TransactionEntryForm;
