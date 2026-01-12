import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/register', { name, email, password });
      alert("Account created! Please log in.");
      navigate('/login');

    } catch (err) {
      console.error("Signup Error:", err); // Log to console for debugging

      if (err.response) {
        // Case 1: Server Validation Error (e.g., "Email exists")
        if (err.response.data && err.response.data.error) {
            alert(err.response.data.error);
        } 
        // Case 2: Array of Errors (e.g., "Password too short")
        else if (err.response.data && err.response.data.errors) {
            alert(err.response.data.errors[0].msg);
        }
        // Case 3: Server Crash (500 Internal Server Error)
        else if (typeof err.response.data === 'string') {
            alert("Server Error: " + err.response.data); 
        } 
        else {
            alert("Signup failed: Server responded with status " + err.response.status);
        }
      } else {
        alert("Network Error: Is your backend running?");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p>Start tracking your expenses today.</p>
        
        <form onSubmit={handleSignup} className="auth-form">
          <input 
            type="text" 
            className="auth-input"
            placeholder="Full Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            minLength={3}
          />
          <input 
            type="email" 
            className="auth-input"
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            className="auth-input"
            placeholder="Password (Min 5 chars)" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            minLength={5} 
          />
          <button type="submit" className="auth-btn">Get Started</button>
        </form>

        <div className="auth-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;