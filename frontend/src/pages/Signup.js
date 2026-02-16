import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/globalContext';
import './Signup.css';

const getStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[a-z]/.test(password) && /\d/.test(password)) score += 25;
  if (/[^A-Za-z\d]/.test(password)) score += 25;
  return score;
};

const getStrengthLabel = (score) => {
  if (score <= 25) return 'Weak';
  if (score <= 50) return 'Fair';
  if (score <= 75) return 'Good';
  return 'Strong';
};

const Signup = () => {
  const navigate = useNavigate();
  const { registerUser, error, setError } = useGlobalContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const strengthScore = useMemo(() => getStrength(form.password), [form.password]);
  const strengthLabel = useMemo(() => getStrengthLabel(strengthScore), [strengthScore]);
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const onSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');
    if (error) setError(null);

    if (form.password !== form.confirmPassword) {
      setLocalError('Password and confirm password do not match.');
      return;
    }
    if (strengthScore < 100) {
      setLocalError('Use a stronger password (8+ chars, upper/lowercase, number, symbol).');
      return;
    }

    setIsSubmitting(true);
    const success = await registerUser({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword
    });
    setIsSubmitting(false);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="signup-page-shell">
      <main className="signup-split-card">
        <section className="signup-left-panel">
          <div>
            <h1>Create Account</h1>
            <p>Already have an account?</p>
          </div>
          <button type="button" className="signup-ghost-btn" onClick={() => navigate('/login')}>
            Login
          </button>
        </section>

        <section className="signup-right-panel">
          <div className="signup-form-wrap">
            <h2>Register</h2>

            {(localError || error) ? (
              <div className="signup-error-banner">{localError || error}</div>
            ) : null}

            <form className="signup-form" onSubmit={onSubmit}>
              <input
                className="signup-input"
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <input
                className="signup-input"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
              <input
                className="signup-input"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />

              <div className="strength-wrap">
                <div className="strength-track">
                  <span style={{ width: `${strengthScore}%` }} />
                </div>
                <small>Password strength: {strengthLabel}</small>
              </div>

              <input
                className="signup-input"
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
              />
              <small className={`confirm-note ${passwordsMatch ? 'ok' : ''}`}>
                {form.confirmPassword ? (passwordsMatch ? 'Passwords match' : 'Passwords do not match') : 'Confirm your password'}
              </small>

              <button className="signup-submit-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Register'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Signup;
