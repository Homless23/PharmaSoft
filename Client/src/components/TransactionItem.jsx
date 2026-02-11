import React from 'react';

const TransactionItem = ({ transaction }) => {
    // Format number to currency
    const sign = transaction.type === 'expense' ? '-' : '+';
    const colorClass = transaction.type === 'expense' ? 'minus' : 'plus';

    return (
        <li className={colorClass}>
            <div className="item-info">
                <span>{transaction.text}</span>
                <small>{transaction.category}</small>
            </div>
            <span>
                {sign}${Math.abs(transaction.amount).toFixed(2)}
            </span>
        </li>
    );
};

export default TransactionItem;