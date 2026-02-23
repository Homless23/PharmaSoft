import React, { useMemo } from 'react';
import { Card, Col, Empty, Row, Tag, Typography } from 'antd';

const BUCKETS = [
  { key: 'expired', label: 'Expired', color: '#ff4d4f' },
  { key: 'd7', label: '0-7 Days', color: '#fa8c16' },
  { key: 'd30', label: '8-30 Days', color: '#faad14' },
  { key: 'd60', label: '31-60 Days', color: '#fadb14' },
  { key: 'd90', label: '61-90 Days', color: '#95de64' },
  { key: 'fresh', label: '90+ Days', color: '#52c41a' }
];

const ExpiryHeatmap = ({ medicines = [] }) => {
  const { Text } = Typography;
  const counts = useMemo(() => {
    const next = { expired: 0, d7: 0, d30: 0, d60: 0, d90: 0, fresh: 0 };
    const now = Date.now();
    medicines.forEach((item) => {
      const value = item?.expiryDate ? new Date(item.expiryDate).getTime() : NaN;
      if (Number.isNaN(value)) return;
      const days = Math.ceil((value - now) / (24 * 60 * 60 * 1000));
      if (days < 0) next.expired += 1;
      else if (days <= 7) next.d7 += 1;
      else if (days <= 30) next.d30 += 1;
      else if (days <= 60) next.d60 += 1;
      else if (days <= 90) next.d90 += 1;
      else next.fresh += 1;
    });
    return next;
  }, [medicines]);

  const total = Object.values(counts).reduce((sum, n) => sum + Number(n || 0), 0);

  return (
    <Card title="Expiry Heatmap">
      {total ? (
        <Row gutter={[10, 10]}>
          {BUCKETS.map((bucket) => {
            const value = counts[bucket.key] || 0;
            return (
              <Col xs={12} md={8} lg={4} key={bucket.key}>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 10, background: '#fff' }}>
                  <Tag color={bucket.color} style={{ marginBottom: 8 }}>{bucket.label}</Tag>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
                  <Text type="secondary">SKUs</Text>
                </div>
              </Col>
            );
          })}
        </Row>
      ) : (
        <Empty description="No expiry dates available for heatmap" />
      )}
    </Card>
  );
};

export default ExpiryHeatmap;
