import React, { useMemo } from 'react';
import { Drawer, Empty, List, Space, Tag, Typography } from 'antd';

const PatientHistoryDrawer = ({
  open,
  onClose,
  patientName,
  purchases = [],
  knownAllergies = []
}) => {
  const { Text, Title } = Typography;
  const recent = useMemo(() => purchases.slice(0, 10), [purchases]);

  return (
    <Drawer
      title={`Patient History: ${patientName || 'Walk-in Customer'}`}
      open={open}
      onClose={onClose}
      width={520}
    >
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <div>
          <Title level={5} style={{ marginBottom: 8 }}>Known Allergies</Title>
          {knownAllergies.length ? (
            <Space wrap>
              {knownAllergies.map((item) => <Tag color="volcano" key={item}>{item}</Tag>)}
            </Space>
          ) : (
            <Text type="secondary">No allergy notes on record.</Text>
          )}
        </div>

        <div>
          <Title level={5} style={{ marginBottom: 8 }}>Last 10 Purchases</Title>
          {recent.length ? (
            <List
              size="small"
              dataSource={recent}
              renderItem={(item) => (
                <List.Item key={item.rowKey}>
                  <List.Item.Meta
                    title={`${item.medicineName} (${item.qty})`}
                    description={`${new Date(item.billDate).toLocaleString()} | Invoice ${item.billNumber || '-'} | Rs.${Number(item.amount || 0).toLocaleString()}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No purchase history found for this patient." />
          )}
        </div>
      </Space>
    </Drawer>
  );
};

export default PatientHistoryDrawer;
