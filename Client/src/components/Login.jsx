import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { useNavigate } from 'react-router-dom'; // Requires react-router-dom

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { login, error, isAuthenticated, clearErrors } = useContext(GlobalContext);
  const navigate = useNavigate();

  useEffect(() => {
    // If logged in, redirect to Dashboard immediately
    if (isAuthenticated) {
      navigate('/'); 
    }
    // Clear errors when component loads
    clearErrors();
    // eslint-disable-next-line
  }, [isAuthenticated, navigate]);

  const onSubmit = e => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    // Change <div className="card" ...> to:
<div className="glass" style={{ maxWidth: '400px', margin: '3rem auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Login</h2>
      
      {error && <div className="error-msg">{error}</div>}
      
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label>Email Address</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="form-input" 
            required 
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="form-input" 
            required 
          />
        </div>
        <button type="submit" className="btn-primary">Login</button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        No account? <a href="/register" style={{ color: '#4f46e5' }}>Register here</a>
      </p>
    </div>
  );
};