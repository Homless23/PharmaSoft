import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { useNavigate } from 'react-router-dom';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { register, error, isAuthenticated, clearErrors } = useContext(GlobalContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
    clearErrors();
    // eslint-disable-next-line
  }, [isAuthenticated, navigate]);

  const onSubmit = e => {
    e.preventDefault();
    register({ name, email, password });
  };

  return (
    <div className="glass" style={{ maxWidth: '400px', margin: '3rem auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Register</h2>
      
      {error && <div className="error-msg">{error}</div>}
      
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label>Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="form-input" 
            required 
          />
        </div>
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
        <button type="submit" className="btn-primary">Create Account</button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Already have an account? <a href="/login" style={{ color: '#4f46e5' }}>Login</a>
      </p>
    </div>
  );
};