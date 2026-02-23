import React from 'react';
import { InputNumber, List, Modal, Space, Typography } from 'antd';

const BatchSelectionOverlay = ({
  batchOverlay,
  closeBatchOverlay,
  setBatchOverlay,
  commitOverlaySelection,
  formatDisplayDate,
  qtyOverlayInputRef
}) => {
  const { Title, Text } = Typography;
  if (!batchOverlay.open) return null;
  return (
    <Modal
      open={batchOverlay.open}
      title="Select Batch"
      onCancel={closeBatchOverlay}
      onOk={commitOverlaySelection}
      okText="Add Item"
      cancelText="Cancel"
      destroyOnClose
      maskClosable={false}
      keyboard
    >
      <div
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeBatchOverlay();
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setBatchOverlay((prev) => ({
              ...prev,
              selectedIndex: Math.min(prev.selectedIndex + 1, Math.max(prev.batches.length - 1, 0))
            }));
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setBatchOverlay((prev) => ({
              ...prev,
              selectedIndex: Math.max(prev.selectedIndex - 1, 0)
            }));
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            commitOverlaySelection();
          }
        }}
      >
        <Title level={4}>{batchOverlay.medicine?.name || 'Medicine'}</Title>
        <List
          dataSource={batchOverlay.batches}
          renderItem={(batch, idx) => (
            <List.Item
              key={`${batch.batchNumber}_${batch.expiryDate || idx}`}
              onClick={() => setBatchOverlay((prev) => ({ ...prev, selectedIndex: idx }))}
              style={{
                cursor: 'pointer',
                border: idx === batchOverlay.selectedIndex ? '1px solid #1677ff' : '1px solid #f0f0f0',
                borderRadius: 8,
                marginBottom: 8,
                padding: 8
              }}
            >
              <Space direction="vertical" size={0}>
                <strong>{batch.batchNumber}</strong>
                <Text type="secondary">
                Exp: {batch.expiryDate ? formatDisplayDate(batch.expiryDate) : '-'} | Stock: {batch.qty}
                </Text>
              </Space>
            </List.Item>
          )}
        />
        <div style={{ marginTop: 8 }}>
          <Text>Quantity</Text>
          <InputNumber
            ref={qtyOverlayInputRef}
            min="1"
            step="1"
            style={{ width: '100%' }}
            value={batchOverlay.qty}
            onChange={(value) => setBatchOverlay((prev) => ({ ...prev, qty: value ?? 1 }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitOverlaySelection();
              }
            }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default BatchSelectionOverlay;
