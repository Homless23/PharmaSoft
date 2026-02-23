import React, { useMemo } from 'react';
import { Card, Empty, List, Tag, Typography } from 'antd';

const typeToColor = (type) => {
  if (type === 'success') return 'green';
  if (type === 'warning') return 'orange';
  if (type === 'error') return 'red';
  return 'blue';
};

const StaffActivityFeed = ({ notifications = [] }) => {
  const { Text } = Typography;
  const items = useMemo(
    () =>
      (Array.isArray(notifications) ? notifications : [])
        .slice(0, 12)
        .map((item) => ({
          id: item?._id || item?.id || `${item?.message}_${item?.createdAt}`,
          message: String(item?.message || 'Activity'),
          type: String(item?.type || 'info'),
          createdAt: item?.createdAt ? new Date(item.createdAt) : null
        })),
    [notifications]
  );

  return (
    <Card title="Staff Activity Feed">
      {items.length ? (
        <List
          size="small"
          dataSource={items}
          renderItem={(item) => (
            <List.Item key={item.id}>
              <List.Item.Meta
                title={(
                  <span>
                    <Tag color={typeToColor(item.type)}>{item.type.toUpperCase()}</Tag>
                    {item.message}
                  </span>
                )}
                description={<Text type="secondary">{item.createdAt ? item.createdAt.toLocaleString() : '-'}</Text>}
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No activity yet" />
      )}
    </Card>
  );
};

export default StaffActivityFeed;
