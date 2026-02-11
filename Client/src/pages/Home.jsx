import React, { useEffect, useState } from 'react';
import { useGlobalContext } from '../context/globalContext';
import Summary from '../components/Summary';

function Home() {
    const { user, logoutUser, addExpense, getExpenses, expenses, deleteExpense } = useGlobalContext();
    
    // Local state for the input form
    const [form, setForm] = useState({
        title: '',
        amount: '',
        category: 'Food',
        description: '',
        date: ''
    });

    // --- NEW: Search State ---
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch data from backend on mount
    useEffect(() => {
        if (user) getExpenses();
    }, [user]);

    const handleSubmit = (e) => {
        e.preventDefault();
        addExpense(form);
        setForm({ title: '', amount: '', category: 'Food', description: '', date: '' });
    };

    // --- NEW: Filter Logic ---
    const filteredExpenses = expenses.filter((expense) => {
        return (
            expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <div className="app-container">
            {/* Header / Navigation Section */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, textAlign: 'left' }}>Expense Tracker</h1>
                    <p style={{ margin: 0, color: '#666' }}>Welcome back, <strong>{user?.name}</strong></p>
                </div>
                <button onClick={logoutUser} className="btn-logout">Logout</button>
            </nav>

            {/* Financial Summary Component (JSX) */}
            <Summary expenses={expenses} />

            <div className="home-layout">
                {/* Left Side: Input Form */}
                <div className="form-section">
                    <h3>Add Transaction</h3>
                    <form onSubmit={handleSubmit}>
                        <input 
                            type="text" 
                            placeholder="Expense Title" 
                            value={form.title} 
                            onChange={e => setForm({...form, title: e.target.value})} 
                            required 
                        />
                        <input 
                            type="number" 
                            placeholder="Amount" 
                            value={form.amount} 
                            onChange={e => setForm({...form, amount: e.target.value})} 
                            required 
                        />
                        <input 
                            type="date" 
                            value={form.date} 
                            onChange={e => setForm({...form, date: e.target.value})} 
                            required 
                        />
                        <select 
                            value={form.category} 
                            onChange={e => setForm({...form, category: e.target.value})}
                        >
                            <option value="Food">Food</option>
                            <option value="Transport">Transport</option>
                            <option value="Income">Income</option>
                            <option value="Rent">Rent</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Other">Other</option>
                        </select>
                        <textarea 
                            placeholder="Add a description..." 
                            value={form.description} 
                            onChange={e => setForm({...form, description: e.target.value})} 
                            rows="3"
                            required 
                        />
                        <button type="submit">Add Transaction</button>
                    </form>
                </div>

                {/* Right Side: History List */}
                <div className="list-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3>Recent History</h3>
                        {/* --- NEW: Search Input --- */}
                        <input 
                            type="text" 
                            placeholder="Search history..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '50%', padding: '8px', fontSize: '14px' }}
                        />
                    </div>

                    {filteredExpenses.length > 0 ? (
                        filteredExpenses.map((expense) => (
                            <div 
                                key={expense._id} 
                                className={`expense-item ${expense.category === 'Income' ? 'item-inc' : 'item-exp'}`}
                            >
                                <div className="expense-details">
                                    <strong style={{ fontSize: '1.1rem' }}>{expense.title}</strong>
                                    <p className="expense-amount" style={{ margin: '5px 0', fontSize: '1.2rem' }}>
                                        {expense.category === 'Income' ? '+' : '-'}${expense.amount}
                                    </p>
                                    <small style={{ color: '#777' }}>
                                        {new Date(expense.date).toLocaleDateString()} • {expense.category}
                                    </small>
                                </div>
                                <button 
                                    onClick={() => deleteExpense(expense._id)} 
                                    className="btn-delete"
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    ) : (
                        <p style={{textAlign: 'center', color: '#777', marginTop: '20px'}}>
                            {searchTerm ? "No matches found." : "No transactions found."}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Home;