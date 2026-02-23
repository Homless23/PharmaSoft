import React from 'react';
import { Alert, Button, Input, List, Modal, Space, Typography } from 'antd';

const ExpiredOverrideModal = ({
  show,
  expiredLineWarnings,
  formatDisplayDate,
  overrideToken,
  setOverrideToken,
  overrideReason,
  setOverrideReason,
  setShowExpiredOverrideModal,
  saveBill,
  saving
}) => {
  const { Text } = Typography;
  if (!show) return null;
  return (
    <Modal
      open={show}
      title="Expired Medicine Warning"
      onCancel={() => {
        setShowExpiredOverrideModal(false);
        setOverrideToken('');
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            setShowExpiredOverrideModal(false);
            setOverrideToken('');
          }}
        >
          Cancel
        </Button>,
        <Button key="finalize" type="primary" danger onClick={saveBill} loading={saving}>
          Apply Token & Finalize
        </Button>
      ]}
      destroyOnClose
      maskClosable={false}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Alert
          type="error"
          showIcon
          message="One or more items in this bill are expired. This sale is blocked. A valid admin override token is required."
        />
        <Alert
          type="warning"
          showIcon
          message="Override usage is audited with user, reason, and timestamp."
        />
        <List
          dataSource={expiredLineWarnings}
          renderItem={(item) => (
            <List.Item key={item.lineId}>
              <Space direction="vertical" size={0}>
                <strong>{item.medicineName}</strong>
                <Text type="secondary">Batch: {item.batchNumber}</Text>
                <Text type="secondary">Expired on: {formatDisplayDate(item.expiryDate)}</Text>
              </Space>
            </List.Item>
          )}
        />
        <Input value={overrideToken} onChange={(e) => setOverrideToken(e.target.value)} placeholder="Override Token (OVR-...)" />
        <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Override Reason" />
      </Space>
    </Modal>
  );
};

export default ExpiredOverrideModal;
