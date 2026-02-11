import React, { useState } from 'react';
import { useGlobalContext } from '../context/globalContext';
import { Link } from 'react-router-dom';

function Login() {
    const { loginUser, error, setError } = useGlobalContext();
    const [form, setForm] = useState({
        email: '',
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); // Clear any old errors before trying again
        await loginUser(form);
    };

    return (
        <div className="app-container" style={{ maxWidth: '450px', margin: '80px auto' }}>
            <h2>Welcome Back</h2>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                Log in to manage your expenses
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
                        type="email" 
                        placeholder="Email Address" 
                        required 
                        value={form.email}
                        onChange={e => setForm({...form, email: e.target.value})} 
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        required 
                        value={form.password}
                        onChange={e => setForm({...form, password: e.target.value})} 
                    />
                    <button type="submit" style={{ marginTop: '10px' }}>Sign In</button>
                </div>
            </form>

            <div style={{ marginTop: '25px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <p style={{ fontSize: '14px', color: '#777' }}>
                    Don't have an account? <Link to="/signup" style={{ color: '#4A90E2', fontWeight: '600' }}>Create one here</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;