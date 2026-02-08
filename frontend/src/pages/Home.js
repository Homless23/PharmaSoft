import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import emailjs from '@emailjs/browser';
import { API_URL } from '../config';
import './Home.css';

// --- LEVEL 2 SAFE MODE: EMAIL IS ON, CHARTS ARE OFF ---

// Configuration
const RATES = {
    NPR: { rate: 1, symbol: 'Rs ' },
    USD: { rate: 0.0075, symbol: '$' },
};

function Home() {
  const navigate = useNavigate();
  
  // State
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currency, setCurrency] = useState('NPR');

  // Form State
  const [form, setForm] = useState({ 
    title: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] 
  });

  // 1. Fetch Data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    const fetchData = async () => {
      try {
        const config = { headers: { 'auth-token': token } };
        // Fetch Expenses and Categories
        const [expRes, catRes] = await Promise.all([
            axios.get(`${API_URL}/api/expenses`, config),
            axios.get(`${API_URL}/api/categories`, config)
        ]);
        
        // Safety Check: Ensure we always set an Array
        setExpenses(Array.isArray(expRes.data) ? expRes.data : []);
        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      } catch (err) { 
          console.error("Fetch Error:", err); 
      } finally { 
          setLoading(false); 
      }
    };
    fetchData();
  }, [navigate]);

  // 2. Add Expense & Send Email
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    
    // Convert display amount to base amount (NPR)
    const baseAmount = parseFloat(form.amount) / RATES[currency].rate;
    const payload = { ...form, amount: baseAmount };

    try {
      const res = await axios.post(`${API_URL}/api/expenses/add`, payload, { headers: { 'auth-token': token } });
      
      const newExpense = res.data.expense ? res.data.expense : res.data;
      const alertData = res.data.alert ? res.data.alert : null;

      // Add to list safely
      if (newExpense) {
          setExpenses([newExpense, ...expenses]);
      }

      // 📧 CHECK FOR EMAIL ALERT (YOUR KEYS ARE HERE)
      if (alertData && alertData.triggered) {
          console.log("🚨 Budget Limit Reached! Sending Email...");
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
          .then(() => alert(`🚨 Over Budget! Email sent to ${alertData.email}`))
          .catch(err => console.error("Email Failed:", err));
      } else {
          console.log("✅ Within budget.");
      }

      // Reset Form
      setForm({ title: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] });

    } catch (err) {
      alert("Error saving expense. Check console.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (id) => {
    if(!window.confirm("Delete this?")) return;
    try {
        await axios.delete(`${API_URL}/api/expenses/${id}`, { headers: { 'auth-token': localStorage.getItem('token') } });
        setExpenses(expenses.filter(e => e._id !== id));
    } catch(err) { console.error(err); }
  };

  // Helper to format money
  const formatMoney = (val) => {
      if(!val) return "0";
      return (val * RATES[currency].rate).toFixed(2);
  };

  const allCategories = ["Food", "Transport", "Entertainment", "Bills", "Health", "Shopping", ...categories.map(c => c.name)];

  if (loading) return <div style={{padding:'20px'}}>Loading...</div>;

  return (
    <div className="home-container">
      {/* Navbar */}
      <nav className="navbar">
          <Link to="/" className="nav-brand" style={{textDecoration:'none'}}>✨ ExpenseTracker</Link>
          <button onClick={() => {localStorage.removeItem('token'); navigate('/login')}} style={{background:'var(--primary)', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>Logout</button>
      </nav>

      <div className="dashboard-container">
        {/* Left: Add Expense */}
        <div className="controls-column">
            <div className="ui-card">
                <h3>Add Expense</h3>
                <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <input className="modern-input" placeholder="What did you buy?" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                    <input className="modern-input" type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                    <select className="modern-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                        {allCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                    <button type="submit" className="primary-btn" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Add Expense"}
                    </button>
                </form>
            </div>
        </div>

        {/* Right: List */}
        <div className="history-column">
            <h3>History</h3>
            <div className="transaction-list">
                {expenses.length === 0 ? <p>No expenses yet.</p> : expenses.map(item => (
                    <div key={item._id} className="transaction-card">
                        <div>
                            <strong>{item.title}</strong>
                            <div style={{fontSize:'0.8rem', color:'#666'}}>{item.category}</div>
                        </div>
                        <div>
                            <span style={{fontWeight:'bold', color:'red'}}>- {RATES[currency].symbol} {formatMoney(item.amount)}</span>
                            <button onClick={() => deleteExpense(item._id)} style={{marginLeft:'10px', background:'none', border:'none', cursor:'pointer'}}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

export default Home;