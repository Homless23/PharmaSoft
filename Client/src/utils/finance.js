/**
 * Calculates financial summaries with precision
 * @param {Array} transactions 
 */
export const calculateSummary = (transactions) => {
    return transactions.reduce((acc, transaction) => {
        const amount = Number(transaction.amount);
        
        if (transaction.type === 'income') {
            acc.income += amount;
        } else {
            acc.expense += Math.abs(amount);
        }
        
        acc.balance += amount;
        
        return acc;
    }, { balance: 0, income: 0, expense: 0 });
};