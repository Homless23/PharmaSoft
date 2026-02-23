import React, { useState } from 'react';
import { Button, Card, InputNumber, Progress, Space, Typography } from 'antd';
import { useGlobalContext } from '../context/globalContext';

const CategoryBudgetSection = ({ minimal = false }) => {
  const { categories, transactions, editBudget } = useGlobalContext();
  const { Text } = Typography;
  const [editingId, setEditingId] = useState(null);
  const [tempBudget, setTempBudget] = useState(0);

  const getSpent = (catName) =>
    transactions
      .filter((tx) => tx.category === catName && (tx.type || 'outflow') !== 'income')
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const startEditing = (cat) => {
    setEditingId(cat._id);
    setTempBudget(cat.budget || 0);
  };

  const saveEditing = async (id) => {
    await editBudget(id, Number(tempBudget) || 0);
    setEditingId(null);
  };

  return (
    <Card size={minimal ? 'small' : 'default'} title="Budget by Category">
      <Space direction="vertical" style={{ width: '100%' }}>
        {categories.map((cat) => {
          const spent = getSpent(cat.name);
          const budget = Number(cat.budget || 0);
          const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
          const status = percentage >= 90 ? 'exception' : percentage >= 70 ? 'normal' : 'success';

          return (
            <div key={cat._id}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                <Text strong>{cat.name}</Text>
                {editingId === cat._id ? (
                  <Space>
                    <InputNumber value={tempBudget} onChange={(v) => setTempBudget(v ?? 0)} />
                    <Button onClick={() => saveEditing(cat._id)}>Save</Button>
                  </Space>
                ) : (
                  <Button onClick={() => startEditing(cat)}>
                    Rs {spent.toLocaleString()} / {budget.toLocaleString()}
                  </Button>
                )}
              </Space>
              <Progress percent={Number(percentage.toFixed(1))} status={status} />
            </div>
          );
        })}
      </Space>
    </Card>
  );
};

export default CategoryBudgetSection;

