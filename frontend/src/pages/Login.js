import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaEnvelope, FaLock } from 'react-icons/fa';

const API_URL = "http://localhost:5000/api/v1/auth/login";

function Login() {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { email, password } = formData;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await axios.post(API_URL, {
                email,
                password
            }, { withCredentials: true });

            setIsLoading(false);
            console.log("Login Success:", res.data);
            
            // --- THE FIX: Set a flag so App.js knows we are logged in ---
            localStorage.setItem('auth-token', 'true'); 
            
            navigate('/'); 

        } catch (err) {
            setIsLoading(false);
            console.error("Login Error:", err.response);
            setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
        }
    };

    return (
        <LoginStyled>
            {/* ... Keep your existing JSX (Form, Inputs, etc) ... */}
            <div className="login-card">
                <div className="header">
                    <h2>Welcome Back</h2>
                    <p>Enter your credentials to access your finance tracker.</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-control">
                        <FaEnvelope className="icon" />
                        <input 
                            type="email" 
                            name="email" 
                            value={email} 
                            placeholder="Email Address" 
                            onChange={handleChange} 
                            required 
                        />
                    </div>

                    <div className="input-control">
                        <FaLock className="icon" />
                        <input 
                            type="password" 
                            name="password" 
                            value={password} 
                            placeholder="Password" 
                            onChange={handleChange} 
                            required 
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="submit-btn" 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Accessing Vault...' : 'SIGN IN'}
                    </button>
                </form>

                <div className="footer">
                    <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
                </div>
            </div>
        </LoginStyled>
    );
}

// ... Keep your LoginStyled CSS ...
const LoginStyled = styled.div`
  /* ... your existing styles ... */
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #121212 0%, #000000 100%);
    padding: 1rem;

    .login-card {
        background: rgba(30, 30, 46, 0.95);
        padding: 3rem 2.5rem;
        border-radius: 20px;
        width: 100%;
        max-width: 450px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }
    
    /* ... rest of your styles ... */
    .header { text-align: center; h2 { font-size: 2rem; color: #fff; margin-bottom: 0.5rem; } p { color: rgba(255,255,255,0.5); font-size: 0.9rem; } }
    .error-message { background: rgba(231, 76, 60, 0.1); border: 1px solid #e74c3c; color: #e74c3c; padding: 0.8rem; border-radius: 8px; text-align: center; }
    form { display: flex; flex-direction: column; gap: 1.5rem; }
    .input-control { position: relative; .icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); } input { width: 100%; background: #2a2a35; border: 1px solid rgba(255,255,255,0.05); padding: 1rem 1rem 1rem 3rem; border-radius: 12px; color: #fff; outline: none; transition: all 0.3s ease; box-sizing: border-box; &:focus { border-color: #27ae60; background: #323240; } } }
    .submit-btn { width: 100%; padding: 1rem; border-radius: 12px; border: none; background: #27ae60; color: white; font-weight: 700; cursor: pointer; transition: all 0.3s ease; &:hover { transform: translateY(-2px); } &:disabled { background: #444; cursor: not-allowed; } }
    .footer { text-align: center; p { color: rgba(255,255,255,0.5); } a { color: #27ae60; text-decoration: none; } }
`;

export default Login;