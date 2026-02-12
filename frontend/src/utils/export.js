import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

export const exportExpensesToCSV = (items, filename = 'expenses.csv') => {
  const headers = ['Date', 'Title', 'Category', 'Amount', 'Recurring', 'Description'];
  const rows = items.map((item) => [
    formatDate(item.date),
    `"${String(item.title || '').replace(/"/g, '""')}"`,
    `"${String(item.category || '').replace(/"/g, '""')}"`,
    Number(item.amount || 0).toFixed(2),
    item.recurring?.enabled ? item.recurring?.frequency || 'yes' : 'no',
    `"${String(item.description || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportExpensesToPDF = (items, filename = 'expenses.pdf') => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Expense Report', 14, 16);

  autoTable(doc, {
    startY: 24,
    head: [['Date', 'Title', 'Category', 'Amount', 'Recurring']],
    body: items.map((item) => [
      formatDate(item.date),
      String(item.title || ''),
      String(item.category || ''),
      `Rs ${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      item.recurring?.enabled ? item.recurring.frequency || 'Yes' : 'No'
    ])
  });

  doc.save(filename);
};
