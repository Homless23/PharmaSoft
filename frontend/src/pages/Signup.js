import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Input, Progress, Row, Space, Typography } from 'antd';
import { useGlobalContext } from '../context/globalContext';

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
  const { Title, Text } = Typography;
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
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 980 }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={10}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Title level={2} style={{ marginBottom: 0 }}>Create Account</Title>
              <Text type="secondary">Already have an account?</Text>
              <Button onClick={() => navigate('/login')}>Login</Button>
            </Space>
          </Col>
          <Col xs={24} md={14}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Title level={3} style={{ marginBottom: 0 }}>Register</Title>
              {(localError || error) ? <Alert type="error" showIcon message={localError || error} /> : null}
              <Form layout="vertical" onSubmitCapture={onSubmit}>
                <Form.Item label="Full name" required>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </Form.Item>
                <Form.Item label="Email" required>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </Form.Item>
                <Form.Item label="Password" required>
                  <Input.Password
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </Form.Item>
                <Progress percent={strengthScore} size="small" />
                <Text type="secondary">Password strength: {strengthLabel}</Text>
                <Form.Item label="Confirm password" required>
                  <Input.Password
                    value={form.confirmPassword}
                    onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </Form.Item>
                <Text type={passwordsMatch ? 'success' : 'secondary'}>
                  {form.confirmPassword ? (passwordsMatch ? 'Passwords match' : 'Passwords do not match') : 'Confirm your password'}
                </Text>
                <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" loading={isSubmitting} block>
                    Register
                  </Button>
                </Form.Item>
              </Form>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Signup;
