import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalContext } from '../context/globalContext';
import './Auth.css';

const Login = () => {
  const { loginUser, error, setError } = useGlobalContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    await loginUser({ email: form.email.trim(), password: form.password });
    setIsSubmitting(false);
  };

  return (
    <div className="auth-shell">
      <div className="auth-glow auth-glow-left" />
      <div className="auth-glow auth-glow-right" />

      <main className="auth-card">
        <p className="eyebrow">Expense OS</p>
        <h2>Welcome Back</h2>
        <p className="muted">Log in to manage your spending, budgets, and analytics.</p>

        {error && <div className="alert-error">{error}</div>}

        <form className="auth-form" onSubmit={onSubmit}>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={form.email}
            required
            onChange={(e) => {
              if (error) setError(null);
              setForm((prev) => ({ ...prev, email: e.target.value }));
            }}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={form.password}
            required
            onChange={(e) => {
              if (error) setError(null);
              setForm((prev) => ({ ...prev, password: e.target.value }));
            }}
          />
          <button className="primary-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: '1rem' }}>
          New here? <Link className="auth-link" to="/signup">Create account</Link>
        </p>
      </main>
    </div>
  );
};

export default Login;
