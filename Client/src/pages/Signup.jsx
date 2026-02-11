import React, { useState } from 'react';
import { useGlobalContext } from '../context/globalContext';
import { Link } from 'react-router-dom';

function Signup() {
    const { registerUser, error, setError } = useGlobalContext();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        await registerUser(form);
    };

    return (
        <div className="app-container" style={{ maxWidth: '450px', margin: '80px auto' }}>
            <h2>Create Account</h2>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                Start tracking your budget today
            </p>

            {/* Error Message Display */}
            {error && (
                <div style={{ 
                    background: '#ffebee', 
                    color: '#c62828', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '20px', 
                    textAlign: 'center',
                    fontSize: '14px',
                    border: '1px solid #ef9a9a'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input 
                        type="text" 
                        placeholder="Full Name" 
                        required 
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})} 
                    />
                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        required 
                        value={form.email}
                        onChange={e => setForm({...form, email: e.target.value})} 
                    />
                    <input 
                        type="password" 
                        placeholder="Create Password" 
                        required 
                        value={form.password}
                        onChange={e => setForm({...form, password: e.target.value})} 
                    />
                    <button type="submit" style={{ marginTop: '10px' }}>Register</button>
                </div>
            </form>

            <div style={{ marginTop: '25px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <p style={{ fontSize: '14px', color: '#777' }}>
                    Already have an account? <Link to="/login" style={{ color: '#4A90E2', fontWeight: '600' }}>Login Here</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;