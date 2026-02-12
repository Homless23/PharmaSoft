import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalContext } from '../context/globalContext';
import './Auth.css';

const Signup = () => {
  const { registerUser, error, setError } = useGlobalContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    await registerUser({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password
    });
    setIsSubmitting(false);
  };

  return (
    <div className="auth-shell">
      <div className="auth-glow auth-glow-left" />
      <div className="auth-glow auth-glow-right" />

      <main className="auth-card">
        <p className="eyebrow">Expense OS</p>
        <h2>Create Account</h2>
        <p className="muted">Start tracking expenses like a modern SaaS dashboard.</p>

        {error && <div className="alert-error">{error}</div>}

        <form className="auth-form" onSubmit={onSubmit}>
          <input
            className="input"
            type="text"
            placeholder="Full name"
            value={form.name}
            required
            onChange={(e) => {
              if (error) setError(null);
              setForm((prev) => ({ ...prev, name: e.target.value }));
            }}
          />
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
            minLength={6}
            required
            onChange={(e) => {
              if (error) setError(null);
              setForm((prev) => ({ ...prev, password: e.target.value }));
            }}
          />
          <button className="primary-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: '1rem' }}>
          Already registered? <Link className="auth-link" to="/login">Login</Link>
        </p>
      </main>
    </div>
  );
};

export default Signup;
