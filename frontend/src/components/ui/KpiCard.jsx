import React from 'react';
import { Button, Card, Space, Statistic, Tag, Typography } from 'antd';

const KpiCard = ({
  title,
  value,
  trend = 0,
  prefix = '',
  suffix = '',
  meta = '',
  onViewReport = null
}) => {
  const { Text } = Typography;
  const up = Number(trend) >= 0;
  return (
    <Card>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Text type="secondary">{title}</Text>
        <Statistic value={`${prefix}${value}${suffix}`} />
        <Tag color={up ? 'green' : 'red'}>
          {up ? '+' : '-'} {Math.abs(Number(trend)).toFixed(1)}%
        </Tag>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary">{meta || 'N/A'}</Text>
          <Button type="link" onClick={onViewReport || undefined} disabled={!onViewReport}>
            View Report
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export default KpiCard;
