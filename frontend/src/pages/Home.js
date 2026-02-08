import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import emailjs from '@emailjs/browser';
import { API_URL } from '../config';
import './Home.css';

// Feature Imports
import Chatbot from '../components/Chatbot';
import Spinner from '../components/Spinner';

// Chart Imports
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
ChartJS.register(ArcElement, Tooltip, Legend);

// --- CONFIG ---
const RATES = {
    NPR: { rate: 1, symbol: 'Rs ' },
    USD: { rate: 0.0075, symbol: '$' },
    EUR: { rate: 0.0069, symbol: '€' },
    INR: { rate: 0.625, symbol: '₹' }
};

const getCategoryIcon = (cat) => {
  const map = {
    'Food': '🍔', 'Transport': '🚗', 'Entertainment': '🎬', 
    'Bills': '💡', 'Health': '💊', 'Shopping': '🛍️', 'Other': '📦'
  };
  return map[cat] || '📦';
};

function Home() {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [timeRange, setTimeRange] = useState('all'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); 
  
  // Settings
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [currency, setCurrency] = useState('NPR');

  // Forms
  const [form, setForm] = useState({ 
    title: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] 
  });
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [editId, setEditId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // --- HELPERS ---
  const toDisplay = (val) => (!val ? 0 : (val * RATES[currency].rate).toFixed(2));
  const toBase = (val) => (!val ? 0 : parseFloat(val) / RATES[currency].rate);
  const formatMoney = (valNPR) => {
    const converted = (valNPR * RATES[currency].rate);
    return `${RATES[currency].symbol}${converted.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    const fetchData = async () => {
      try {
        const config = { headers: { 'auth-token': token } };
        const [expRes, catRes, userRes] = await Promise.all([
            axios.get(`${API_URL}/api/expenses`, config),
            axios.get(`${API_URL}/api/categories`, config),
            axios.post(`${API_URL}/api/auth/getuser`, {}, config)
        ]);
        // 🛡️ SAFETY CHECK: Ensure data is an array
        setExpenses(Array.isArray(expRes.data) ? expRes.data : []);
        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        setUser(userRes.data);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchData();

    function handleClickOutside(event) {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setIsMenuOpen(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [navigate]);

  // --- FILTERING (WITH SAFETY SHIELD 🛡️) ---
  const getFilteredExpenses = () => {
    if (!expenses || expenses.length === 0) return [];
    
    // 🛡️ Filter out bad data ("ghost" expenses)
    let filtered = expenses.filter(item => {
        return item && item.amount !== undefined && item.amount !== null && !isNaN(item.amount);
    });

    const now = new Date();

    if (timeRange === '7days') {
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - 7);
        filtered = filtered.filter(item => new Date(item.date) >= pastDate);
    } else if (timeRange === '30days') {
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - 30);
        filtered = filtered.filter(item => new Date(item.date) >= pastDate);
    } else if (timeRange === 'custom' && customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999); 
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= start && itemDate <= end;
        });
    }

    if (searchQuery) {
        filtered = filtered.filter(item => 
            (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }
    return filtered;
  };
  const filteredExpenses = getFilteredExpenses();

  // --- TOTALS (ARMORED MATH 🛡️) ---
  const totalSpent = filteredExpenses.reduce((acc, item) => {
    if(!item || !item.amount) return acc;
    return acc + item.amount;
  }, 0);

  const categoryTotals = filteredExpenses.reduce((acc, item) => {
    if(!item || !item.amount) return acc;
    const cat = item.category || 'Other';
    const convertedAmt = item.amount * RATES[currency].rate;
    acc[cat] = (acc[cat] || 0) + convertedAmt;
    return acc;
  }, {});

  const getCategorySpent = (cat) => {
      return filteredExpenses
        .filter(e => e.category === cat)
        .reduce((a, b) => a + (b.amount || 0), 0);
  };

  // --- HANDLERS ---
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(`Expense Report`, 14, 22);
    const rows = filteredExpenses.map(item => [
        new Date(item.date).toLocaleDateString(), 
        item.title || 'Unknown', 
        item.category || 'Other', 
        `${RATES[currency].symbol}${(item.amount * RATES[currency].rate).toFixed(2)}`
    ]);
    autoTable(doc, { head: [["Date", "Item", "Category", "Amount"]], body: rows, startY: 30 });
    doc.save("expenses.pdf");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const token = localStorage.getItem('token');
    const endpoint = editId ? `${API_URL}/api/expenses/${editId}` : `${API_URL}/api/expenses/add`;
    const method = editId ? axios.put : axios.post;
    const payload = { ...form, amount: toBase(form.amount) };

    try {
      const res = await method(endpoint, payload, { headers: { 'auth-token': token } });
      
      const newExpense = res.data.expense ? res.data.expense : res.data;
      const alertData = res.data.alert ? res.data.alert : null;

      if (editId) {
        setExpenses(expenses.map(ex => ex._id === editId ? newExpense : ex));
        setEditId(null);
      } else {
        if (newExpense && newExpense.amount) {
            setExpenses([newExpense, ...expenses]);
        }
        
        // 📧 EMAIL LOGIC (WITH YOUR KEYS)
        if (alertData && alertData.triggered) {
            console.log("🚨 Sending Email...");
            const templateParams = {
                name: alertData.name,
                category: alertData.category,
                limit: alertData.limit,
                spent: alertData.spent,
                to_email: alertData.email
            };
            emailjs.send(
                'service_a6naxq8',     // YOUR SERVICE ID
                'template_2e5yara',    // YOUR TEMPLATE ID
                templateParams, 
                'ADhLMTJlGBcaVRQTM'    // YOUR PUBLIC KEY
            )
            .then(() => alert(`🚨 Over Budget Alert sent for ${alertData.category}!`))
            .catch(err => console.error("Email failed", err));
        }
      }
      setForm({ title: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] });

    } catch (err) { 
      alert("Failed to save."); 
      console.error(err); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (id) => {
    if(!window.confirm("Delete this?")) return;
    try {
      await axios.delete(`${API_URL}/api/expenses/${id}`, { headers: { 'auth-token': localStorage.getItem('token') } });
      setExpenses(expenses.filter(item => item._id !== id));
    } catch (err) { console.error(err); }
  };

  const handleSetBudget = async (id, val) => {
    try {
        await axios.put(`${API_URL}/api/categories/${id}`, { budget: toBase(val) }, { headers: { 'auth-token': localStorage.getItem('token') } });
        setCategories(categories.map(c => c._id === id ? { ...c, budget: toBase(val) } : c));
    } catch(e) {}
  };
  const addNewCategory = async () => {
    if(!newCat) return;
    try {
      const res = await axios.post(`${API_URL}/api/categories/add`, { name: newCat }, { headers: { 'auth-token': localStorage.getItem('token') } });
      setCategories([...categories, res.data]);
      setForm({...form, category: newCat});
      setNewCat(''); setIsCreatingCat(false);
    } catch(e) {}
  };

  const allCategories = ["Food", "Transport", "Entertainment", "Bills", "Health", "Shopping", ...categories.filter(c => c.name).map(c => c.name)];

  return (
    <div className="home-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <Link to="/" className="nav-brand" style={{textDecoration:'none'}}>✨ ExpenseTracker</Link>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={{padding:'5px', borderRadius:'5px'}}>
                <option value="NPR">🇳🇵 NPR</option>
                <option value="USD">🇺🇸 USD</option>
            </select>
            <button onClick={() => setDarkMode(!darkMode)} style={{background:'none', border:'none', fontSize:'1.2rem'}}>{darkMode ? '☀️' : '🌙'}</button>
            <button onClick={() => {localStorage.removeItem('token'); navigate('/login')}} style={{background:'var(--primary)', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>Logout</button>
        </div>
      </nav>

      {loading ? (
        <div style={{marginTop: '100px'}}><Spinner /><p style={{textAlign:'center'}}>Loading...</p></div>
      ) : (
        <div className="dashboard-container">
            {/* CONTROLS */}
            <div className="controls-column">
                <div className="ui-card balance-card">
                    <h3>Total Spent</h3>
                    <h1>{formatMoney(totalSpent)}</h1>
                </div>
                <div className="ui-card">
                    <h3>{editId ? 'Edit' : 'New Transaction'}</h3>
                    <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'0.8rem'}}>
                        <input className="modern-input" placeholder="Item" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                        <div className="form-row">
                            <input type="number" className="modern-input" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                            <input type="date" className="modern-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                        </div>
                        <select className="modern-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                            {allCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                        </select>
                        
                        <button type="submit" className="primary-btn" disabled={isSubmitting} style={{opacity: isSubmitting ? 0.7 : 1}}>
                            {isSubmitting ? 'Saving...' : (editId ? 'Update' : 'Add Expense')}
                        </button>

                    </form>
                </div>
            </div>

            {/* ANALYSIS */}
            <div className="center-column">
                <div className="ui-card">
                    <h3>Analysis</h3>
                    <div className="chart-wrapper">
                        <Doughnut data={{labels: Object.keys(categoryTotals), datasets: [{data: Object.values(categoryTotals), backgroundColor: ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#d63031', '#0984e3']}]}} />
                    </div>
                </div>
                <div className="ui-card">
                    <h3>Budgets</h3>
                    {categories.map(cat => {
                        const spent = getCategorySpent(cat.name);
                        const limit = cat.budget || 0;
                        const pct = limit > 0 ? (spent/limit)*100 : 0;
                        return (
                            <div key={cat._id} className="budget-item">
                                <span>{cat.name}</span>
                                <div className="budget-bar-bg"><div className="budget-bar-fill" style={{width: `${Math.min(pct,100)}%`, background: pct>100?'red':'#00b894'}}></div></div>
                                <input type="number" className="budget-input-mini" placeholder={limit} onBlur={e => handleSetBudget(cat._id, e.target.value)} />
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* HISTORY */}
            <div className="history-column">
                <h3>History <button onClick={downloadPDF} style={{fontSize:'0.8rem'}}>📄</button></h3>
                <div className="transaction-list">
                    {filteredExpenses.map(item => (
                        <div key={item._id} className="transaction-card">
                            <div>
                                <span className="t-title">{item.title}</span>
                                <div className="t-meta">{item.category} • {new Date(item.date).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <span className="t-amount">-{formatMoney(item.amount)}</span>
                                <button onClick={() => deleteExpense(item._id)} style={{marginLeft:'10px', border:'none', background:'none'}}>🗑️</button>
                                <button onClick={() => { setEditId(item._id); setForm({title: item.title, amount: toDisplay(item.amount), category: item.category, date: item.date.split('T')[0]}) }} style={{marginLeft:'5px', border:'none', background:'none'}}>✏️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
      <Chatbot />
    </div>
  );
}

export default Home;