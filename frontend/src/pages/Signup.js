import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa'; // Added FaUser for the name field

// --- HARDCODED URL FIX ---
// Check your backend route. Usually it is '/register' or '/signup'
const API_URL = "http://localhost:5000/api/v1/auth/register";

function Signup() {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { name, email, password } = formData;

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
                name,
                email,
                password
            }, { withCredentials: true });

            setIsLoading(false);
            console.log("Signup Success:", res.data);
            //  Store token if returned
            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
            }
            alert("Account Created! Please Log In.");
            navigate('/login');

        } catch (err) {
            setIsLoading(false);
            console.error("Signup Error:", err.response?.data);
            setError(err.response?.data?.error || 'Failed to create account. Try again.');
        }
    };

    return (
        <SignupStyled>
            <div className="signup-card">
                <div className="header">
                    <h2>Create Account</h2>
                    <p>Start tracking your financial freedom today.</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-control">
                        <FaUser className="icon" />
                        <input 
                            type="text" 
                            name="name" 
                            value={name} 
                            placeholder="Full Name" 
                            onChange={handleChange} 
                            required 
                        />
                    </div>

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
                            placeholder="Password (min 6 chars)" 
                            onChange={handleChange} 
                            required 
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="submit-btn" 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating Account...' : 'REGISTER'}
                    </button>
                </form>

                <div className="footer">
                    <p>Already have an account? <Link to="/login">Log In</Link></p>
                </div>
            </div>
        </SignupStyled>
    );
}

const SignupStyled = styled.div`
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #121212 0%, #000000 100%);
    padding: 1rem;

    .signup-card {
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

    .header {
        text-align: center;
        h2 {
            font-size: 2rem;
            color: #fff;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }
        p {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.9rem;
        }
    }

    .error-message {
        background: rgba(231, 76, 60, 0.1);
        border: 1px solid #e74c3c;
        color: #e74c3c;
        padding: 0.8rem;
        border-radius: 8px;
        text-align: center;
        font-size: 0.9rem;
        animation: shake 0.3s ease-in-out;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .input-control {
        position: relative;
        
        .icon {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.4);
            font-size: 1.1rem;
            transition: color 0.3s ease;
        }

        input {
            width: 100%;
            background: #2a2a35;
            border: 1px solid rgba(255,255,255,0.05);
            padding: 1rem 1rem 1rem 3rem; 
            border-radius: 12px;
            color: #fff;
            font-size: 1rem;
            outline: none;
            transition: all 0.3s ease;
            box-sizing: border-box; /* PREVENTS THE UGLY EXTENDED BAR */

            &::placeholder {
                color: rgba(255, 255, 255, 0.3);
            }

            &:focus {
                background: #323240;
                border-color: #27ae60;
                box-shadow: 0 0 0 4px rgba(39, 174, 96, 0.1);
            }

            &:focus + .icon {
                color: #27ae60;
            }
        }
    }

    .submit-btn {
        width: 100%;
        padding: 1rem;
        border-radius: 12px;
        border: none;
        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
        color: white;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 10px 20px -10px rgba(39, 174, 96, 0.5);

        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 25px -10px rgba(39, 174, 96, 0.6);
        }

        &:disabled {
            background: #444;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
    }

    .footer {
        text-align: center;
        p {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.9rem;
        }
        a {
            color: #27ae60;
            text-decoration: none;
            font-weight: 600;
            margin-left: 0.5rem;
            &:hover {
                text-decoration: underline;
            }
        }
    }

    @keyframes shake {
        0% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        50% { transform: translateX(10px); }
        75% { transform: translateX(-10px); }
        100% { transform: translateX(0); }
    }
`;

export default Signup;