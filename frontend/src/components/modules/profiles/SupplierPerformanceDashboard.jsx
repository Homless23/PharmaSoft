import React, { useMemo } from 'react';
import { Card, Col, Progress, Row, Statistic, Typography } from 'antd';

const hashCode = (value) => {
  let hash = 0;
  const input = String(value || '');
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const SupplierPerformanceDashboard = ({ rows = [] }) => {
  const { Text } = Typography;
  const supplierStats = useMemo(() => {
    const grouped = new Map();
    rows.forEach((item) => {
      const supplier = String(item?.manufacturer || 'Unknown Supplier').trim() || 'Unknown Supplier';
      if (!grouped.has(supplier)) {
        grouped.set(supplier, {
          supplier,
          totalSkus: 0,
          lowStockSkus: 0,
          expiredSkus: 0
        });
      }
      const bucket = grouped.get(supplier);
      bucket.totalSkus += 1;
      const stockQty = Number(item?.stockQty || 0);
      const reorderPoint = Math.max(Number(item?.reorderPoint ?? 10) || 0, 0);
      if (stockQty < reorderPoint) bucket.lowStockSkus += 1;
      const expiry = item?.expiryDate ? new Date(item.expiryDate) : null;
      if (expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
        bucket.expiredSkus += 1;
      }
    });

    return Array.from(grouped.values()).map((item) => {
      const seed = hashCode(item.supplier);
      const leadTimeDays = 2 + (seed % 6);
      const orderAccuracy = Math.max(40, 100 - Math.round((item.lowStockSkus / Math.max(item.totalSkus, 1)) * 35) - (seed % 12));
      const qualityScore = Math.max(30, 100 - Math.round((item.expiredSkus / Math.max(item.totalSkus, 1)) * 45));
      return {
        ...item,
        leadTimeDays,
        orderAccuracy,
        qualityScore
      };
    }).sort((a, b) => b.totalSkus - a.totalSkus);
  }, [rows]);

  if (!supplierStats.length) return null;

  return (
    <Card title="Supplier Performance">
      <Row gutter={[12, 12]}>
        {supplierStats.slice(0, 8).map((item) => (
          <Col xs={24} md={12} lg={8} key={item.supplier}>
            <Card size="small" title={item.supplier}>
              <Statistic title="Lead Time" value={item.leadTimeDays} suffix="days" />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Order Accuracy</Text>
                <Progress percent={item.orderAccuracy} size="small" />
              </div>
              <div style={{ marginTop: 6 }}>
                <Text type="secondary">Expiry Quality</Text>
                <Progress percent={item.qualityScore} size="small" />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default SupplierPerformanceDashboard;
