import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/globalContext';
import api from '../services/api';
import './Login.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { setUser } = useGlobalContext();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/admin/login', {
        email: form.email.trim(),
        password: form.password
      });
      const payload = response?.data || {};
      if (!payload.token || payload.role !== 'admin') {
        throw new Error('Invalid admin login response');
      }
      localStorage.setItem('token', payload.token);
      localStorage.setItem('user', JSON.stringify(payload));
      setUser(payload);
      navigate('/admin');
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        'Admin login failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-shell">
      <main className="login-split-card">
        <section className="login-left-panel">
          <div>
            <h1>Admin Access</h1>
            <p>Restricted control panel</p>
          </div>
        </section>
        <section className="login-right-panel">
          <div className="login-form-wrap">
            <h2>Admin Login</h2>
            {error ? <div className="login-error-banner">{error}</div> : null}
            <form className="login-form" onSubmit={onSubmit}>
              <input
                className="login-input"
                type="email"
                placeholder="Admin Email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
              <input
                className="login-input"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
              <button className="login-submit-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminLogin;
