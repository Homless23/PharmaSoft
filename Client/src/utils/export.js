export const exportToCSV = (transactions) => {
    const headers = ['Date,Description,Category,Type,Amount\n'];
    const rows = transactions.map(t => (
        `${new Date(t.date).toLocaleDateString()},${t.text.replace(/,/g, '')},${t.category},${t.type},${t.amount}`
    ));

    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
};