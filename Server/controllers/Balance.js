import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { formatCurrency } from '../../Client/src/utils/format';

const Balance = () => {
    const { transactions } = useContext(GlobalContext);

    // Calculate balance from the existing transactions in state
    const amounts = transactions.map(transaction => transaction.amount);
    const total = amounts.reduce((acc, item) => (acc += item), 0);

    return (
        <div className="balance-container">
            <h4>Your Balance</h4>
            <h1>{formatCurrency(total)}</h1>
        </div>
    );
};

export default Balance;