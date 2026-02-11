import React from 'react';

const Summary = ({ expenses }) => {
    const income = expenses
        .filter(item => item.category === 'Income')
        .reduce((acc, item) => acc + item.amount, 0);

    const expense = expenses
        .filter(item => item.category !== 'Income')
        .reduce((acc, item) => acc + item.amount, 0);

    const balance = income - expense;

    return (
        <div className="summary-container">
            <div className="summary-card">
                <h5>Total Balance</h5>
                <p className={`amount ${balance >= 0 ? 'pos' : 'neg'}`}>${balance}</p>
            </div>
            <div className="summary-card">
                <h5>Total Income</h5>
                <p className="amount income-text">${income}</p>
            </div>
            <div className="summary-card">
                <h5>Total Expenses</h5>
                <p className="amount expense-text">${expense}</p>
            </div>
        </div>
    );
};

export default Summary;