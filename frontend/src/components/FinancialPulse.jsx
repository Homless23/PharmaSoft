import React from 'react';
import styled from 'styled-components';
import { useGlobalContext } from '../context/globalContext'; // Ensure this matches your context file name

function FinancialPulse() {
    const { incomes, expenses } = useGlobalContext();

    // --- SAFETY CHECK: Default to [] if data is missing ---
    const incomeList = incomes || [];
    const expenseList = expenses || [];

    // Calculate Totals safely
    const totalIncome = incomeList.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = expenseList.reduce((acc, curr) => acc + curr.amount, 0);
    const totalBalance = totalIncome - totalExpense;

    // Calculate percentage for the bar (Prevent divide by zero)
    const maxVal = Math.max(totalIncome, totalExpense) || 1; 
    const incomePercent = (totalIncome / maxVal) * 100;
    const expensePercent = (totalExpense / maxVal) * 100;

    return (
        <PulseStyled>
            <h2>Financial Pulse</h2>
            <div className="pulse-stats">
                <div className="stat-item">
                    <p>Total Income</p>
                    <h3>${totalIncome}</h3>
                    <div className="progress-bar">
                        <div 
                            className="fill income-fill" 
                            style={{width: `${incomePercent}%`}}
                        ></div>
                    </div>
                </div>

                <div className="stat-item">
                    <p>Total Expense</p>
                    <h3>${totalExpense}</h3>
                    <div className="progress-bar">
                        <div 
                            className="fill expense-fill" 
                            style={{width: `${expensePercent}%`}}
                        ></div>
                    </div>
                </div>

                <div className="stat-item balance">
                    <p>Current Balance</p>
                    <h3 style={{color: totalBalance >= 0 ? '#27ae60' : '#e74c3c'}}>
                        ${totalBalance}
                    </h3>
                </div>
            </div>
        </PulseStyled>
    );
}

const PulseStyled = styled.div`
    background: #fcf6f9;
    border: 1px solid #FFFFFF;
    box-shadow: 0px 1px 15px rgba(0, 0, 0, 0.06);
    border-radius: 20px;
    padding: 1rem;
    height: 100%;

    h2 {
        font-size: 1.2rem;
        margin-bottom: 1rem;
    }

    .pulse-stats {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .stat-item {
        p {
            font-size: 0.9rem;
            color: rgba(34, 34, 96, 0.6);
            margin-bottom: 0.3rem;
        }
        h3 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            color: #222260;
        }
    }

    .progress-bar {
        width: 100%;
        height: 8px;
        background: rgba(34, 34, 96, 0.1);
        border-radius: 5px;
        overflow: hidden;
    }

    .fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.5s ease-in-out;
    }

    .income-fill {
        background: #27ae60; /* Green */
    }

    .expense-fill {
        background: #e74c3c; /* Red */
    }
`;

export default FinancialPulse;