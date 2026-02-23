import React from 'react';
import { Alert, Button, Modal, Space, Tag } from 'antd';

const DrugInteractionAlert = ({
  bannerConflicts = [],
  modalConflicts = [],
  open = false,
  onProceed,
  onCancel
}) => {
  return (
    <>
      {bannerConflicts.length ? (
        <Alert
          type="error"
          showIcon
          banner
          style={{ marginBottom: 12 }}
          message={`Potential drug interactions detected (${bannerConflicts.length})`}
          description={
            <Space wrap>
              {bannerConflicts.map((item) => (
                <Tag key={item.key} color={item.severity === 'high' ? 'red' : 'orange'}>
                  {item.left} + {item.right}
                </Tag>
              ))}
            </Space>
          }
        />
      ) : null}
      <Modal
        open={open}
        title="Drug Interaction Warning"
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>Cancel</Button>,
          <Button key="proceed" danger type="primary" onClick={onProceed}>Proceed Anyway</Button>
        ]}
      >
        <p>One or more medicines in this bill may interact with each other.</p>
        <Space direction="vertical" style={{ width: '100%' }}>
          {modalConflicts.map((item) => (
            <Alert
              key={item.key}
              type={item.severity === 'high' ? 'error' : 'warning'}
              showIcon
              message={`${item.left} + ${item.right}`}
              description={item.message}
            />
          ))}
        </Space>
      </Modal>
    </>
  );
};

export default DrugInteractionAlert;
