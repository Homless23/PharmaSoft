import React from 'react';
import { Button, Card, Descriptions, Space, Statistic, Tag, Typography } from 'antd';

const POSSidebarCart = ({
  subtotal = 0,
  discountAmount = 0,
  vatPercent = 13,
  taxAmount = 0,
  grandTotal = 0,
  eodLoading = false,
  billDate,
  eodReport,
  loadEndOfDayReport,
  invoices = [],
  invoiceLoading = false,
  selectedInvoiceId = '',
  onSelectInvoice,
  onPrintInvoice
}) => {
  const { Text } = Typography;
  return (
    <>
      <Card>
        <Statistic title="Grand Total" value={Math.round(Number(grandTotal || 0))} prefix="Rs." />
        <Descriptions column={1} size="small" style={{ marginTop: 8 }}>
          <Descriptions.Item label="Subtotal">Rs.{Math.round(Number(subtotal || 0)).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Discount">Rs.{Math.round(Number(discountAmount || 0)).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label={`VAT (${Number(vatPercent || 0)}%)`}>Rs.{Math.round(Number(taxAmount || 0)).toLocaleString()}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button onClick={() => loadEndOfDayReport(billDate)} loading={eodLoading}>One-Click Report</Button>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Date">{eodReport?.date || billDate}</Descriptions.Item>
            <Descriptions.Item label="Cash">Rs.{Math.round(Number(eodReport?.totals?.cashCollected || 0)).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Digital">Rs.{Math.round(Number(eodReport?.totals?.digitalCollected || 0)).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Profit">Rs.{Math.round(Number(eodReport?.totals?.totalProfit || 0)).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      <Card title="Recent Bills">
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {invoices.slice(0, 8).map((item) => {
            const isActive = String(item._id) === String(selectedInvoiceId || '');
            return (
            <Card
              key={item._id}
              size="small"
              style={isActive ? { borderColor: '#1677ff', boxShadow: '0 0 0 1px rgba(22,119,255,0.2)' } : undefined}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                <div>
                  <strong>{item.billNumber}</strong>
                  <div><Text type="secondary">Rs.{Math.round(item.grandTotal || 0).toLocaleString()}</Text></div>
                </div>
                <Space>
                  <Button type={isActive ? 'primary' : 'default'} onClick={() => onSelectInvoice(item._id)}>
                    {isActive ? 'Viewing' : 'View'}
                  </Button>
                  <Button onClick={() => onPrintInvoice(item, false)}>Print</Button>
                </Space>
              </Space>
              <div style={{ marginTop: 6 }}>
                <Tag>{String(item.paymentMethod || 'cash').toUpperCase()}</Tag>
              </div>
            </Card>
            );
          })}
          {invoiceLoading ? <Text type="secondary">Loading invoices...</Text> : null}
        </Space>
      </Card>
    </>
  );
};

export default POSSidebarCart;
