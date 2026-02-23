import React from 'react';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildThermalInvoiceHtml = (invoice, options = {}) => {
  const previewMode = Boolean(options?.preview);
  const rows = (invoice.items || []).map((item) => `
      <tr>
        <td class="item-cell">${escapeHtml(item.medicineName)}</td>
        <td class="num">${escapeHtml(item.qty)}</td>
        <td class="num">${Number(item.rate || 0).toFixed(2)}</td>
        <td class="num">${Number(item.amount || 0).toFixed(2)}</td>
      </tr>
  `).join('');

  return `
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Invoice ${escapeHtml(invoice.billNumber)}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: ${previewMode ? '20px' : '8px'};
          color: #111;
          background: ${previewMode ? '#f7f8fa' : '#fff'};
        }
        .receipt {
          width: ${previewMode ? 'min(640px, 96vw)' : '280px'};
          margin: 0 auto;
          background: #fff;
          border: ${previewMode ? '1px solid #d9d9d9' : 'none'};
          border-radius: ${previewMode ? '8px' : '0'};
          padding: ${previewMode ? '16px' : '0'};
          box-sizing: border-box;
        }
        .center { text-align: center; }
        h3 { margin: 4px 0; font-size: ${previewMode ? '20px' : '14px'}; }
        p { margin: 2px 0; font-size: ${previewMode ? '13px' : '11px'}; }
        hr { border: 0; border-top: 1px dashed #555; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; font-size: ${previewMode ? '13px' : '11px'}; table-layout: fixed; }
        th, td { padding: ${previewMode ? '4px 2px' : '2px 0'}; text-align: left; vertical-align: top; }
        th.item-col { width: 58%; }
        th.qty-col { width: 10%; text-align: right; }
        th.rate-col { width: 16%; text-align: right; }
        th.amt-col { width: 16%; text-align: right; }
        .item-cell { word-break: break-word; }
        .num { text-align: right; white-space: nowrap; }
        .totals p { display: flex; justify-content: space-between; }
        .grand { font-weight: 700; font-size: ${previewMode ? '16px' : '12px'}; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="center">
          <h3>${escapeHtml(invoice.sellerName || 'Pharmacy')}</h3>
          <p>PAN: ${escapeHtml(invoice.sellerPan || '-')}</p>
          <p>${escapeHtml(invoice.sellerAddress || '-')}</p>
        </div>
        <hr />
        <p><strong>Invoice:</strong> ${escapeHtml(invoice.billNumber || '-')}</p>
        <p><strong>Date:</strong> ${new Date(invoice.billDate).toLocaleString()}</p>
        <p><strong>Customer:</strong> ${escapeHtml(invoice.customerName || 'Walk-in Customer')}</p>
        <p><strong>Payment:</strong> ${escapeHtml(String(invoice.paymentMethod || 'cash').toUpperCase())}</p>
        <hr />
        <table>
          <thead>
            <tr>
              <th class="item-col">Item</th>
              <th class="qty-col">Qty</th>
              <th class="rate-col">Rate</th>
              <th class="amt-col">Amt</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <hr />
        <div class="totals">
          <p><span>Subtotal</span><span>${Number(invoice.subtotal || 0).toFixed(2)}</span></p>
          <p><span>Discount</span><span>${Number(invoice.discountAmount || 0).toFixed(2)}</span></p>
          <p><span>VAT ${Number(invoice.taxPercent || 0)}%</span><span>${Number(invoice.taxAmount || 0).toFixed(2)}</span></p>
          <p class="grand"><span>Total</span><span>${Number(invoice.grandTotal || 0).toFixed(2)}</span></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const InvoiceTemplate = ({ invoice }) => {
  if (!invoice) return null;
  return (
    <div style={{ width: 280, margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: 12 }}>
      <h4 style={{ textAlign: 'center', marginBottom: 4 }}>{invoice.sellerName || 'Pharmacy'}</h4>
      <div style={{ textAlign: 'center' }}>Invoice: {invoice.billNumber}</div>
      <div>Date: {new Date(invoice.billDate).toLocaleString()}</div>
      <div>Customer: {invoice.customerName || 'Walk-in Customer'}</div>
    </div>
  );
};

export default InvoiceTemplate;
