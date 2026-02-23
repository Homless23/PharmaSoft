import React, { useMemo, useState } from 'react';
import { Form, Input, Modal, Space, Tag, Typography } from 'antd';

const normalize = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

const SKUGeneratorModal = ({ open, onClose, onApply }) => {
  const { Text } = Typography;
  const [state, setState] = useState({
    categoryCode: 'MED',
    genericName: '',
    strength: ''
  });

  const sku = useMemo(() => {
    const category = normalize(state.categoryCode || 'MED').slice(0, 4) || 'MED';
    const generic = normalize(state.genericName).slice(0, 5) || 'DRUG';
    const strength = normalize(state.strength).slice(0, 6) || 'GEN';
    return `${category}-${generic}-${strength}`;
  }, [state.categoryCode, state.genericName, state.strength]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="SKU Generator"
      okText="Use SKU"
      onOk={() => {
        if (onApply) onApply(sku);
        if (onClose) onClose();
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Form layout="vertical">
          <Form.Item label="Category Code">
            <Input
              value={state.categoryCode}
              onChange={(e) => setState((prev) => ({ ...prev, categoryCode: e.target.value }))}
              placeholder="MED"
            />
          </Form.Item>
          <Form.Item label="Generic Name">
            <Input
              value={state.genericName}
              onChange={(e) => setState((prev) => ({ ...prev, genericName: e.target.value }))}
              placeholder="Paracetamol"
            />
          </Form.Item>
          <Form.Item label="Strength">
            <Input
              value={state.strength}
              onChange={(e) => setState((prev) => ({ ...prev, strength: e.target.value }))}
              placeholder="500mg"
            />
          </Form.Item>
        </Form>
        <div>
          <Text type="secondary">Generated SKU</Text>
          <div style={{ marginTop: 6 }}>
            <Tag color="blue">{sku}</Tag>
          </div>
        </div>
      </Space>
    </Modal>
  );
};

export default SKUGeneratorModal;
