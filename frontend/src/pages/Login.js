import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/globalContext';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { setUser, pushNotification } = useGlobalContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await axios.post('/api/users/login', {
        email: form.email.trim(),
        password: form.password
      });
      const payload = response?.data || {};
      const token = payload.token || payload.jwt;

      if (!token) {
        throw new Error('Token missing in login response.');
      }

      const userData = {
        ...payload,
        token
      };

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      pushNotification('Signed in successfully', { type: 'success' });
      navigate('/dashboard');
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        setError('Invalid Credentials');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-shell">
      <main className="login-split-card">
        <section className="login-left-panel">
          <div>
            <h1>Hello, Welcome!</h1>
            <p>Don&apos;t have an account?</p>
          </div>
          <button
            type="button"
            className="login-ghost-btn"
            onClick={() => navigate('/signup')}
          >
            Register
          </button>
        </section>

        <section className="login-right-panel">
          <div className="login-form-wrap">
            <h2>Login</h2>

            {error && (
              <div className="login-error-banner">
                {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleLogin}>
              <input
                className="login-input"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(event) => {
                  if (error) setError('');
                  setForm((prev) => ({ ...prev, email: event.target.value }));
                }}
                autoComplete="email"
                required
              />
              <input
                className="login-input"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(event) => {
                  if (error) setError('');
                  setForm((prev) => ({ ...prev, password: event.target.value }));
                }}
                autoComplete="current-password"
                required
              />

              <div className="login-forgot-link">Forgot password?</div>

              <button
                className="login-submit-btn"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
