import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Input, Row, Space, Typography } from 'antd';
import { useGlobalContext } from '../context/globalContext';
import api from '../services/api';
import { ACTIONS, hasPermission, normalizeRole } from '../config/rbacPolicy';

const getDefaultRouteForRole = (user) => {
  const role = normalizeRole(user?.role);
  if (hasPermission(role, ACTIONS.BILLING_ACCESS)) return '/billing';
  if (hasPermission(role, ACTIONS.TRANSACTIONS_MANAGE)) return '/dashboard';
  return '/profile';
};

const Login = () => {
  const navigate = useNavigate();
  const { Title, Text } = Typography;
  const { setUser, pushNotification } = useGlobalContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: form.email.trim(),
        password: form.password
      });
      const payload = response?.data || {};
      if (!payload?._id) {
        throw new Error('Invalid login response.');
      }

      setUser(payload);
      pushNotification('Signed in successfully', { type: 'success' });
      navigate(getDefaultRouteForRole(payload));
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
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 980 }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={10}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Title level={2} style={{ marginBottom: 0 }}>Hello, Welcome!</Title>
              <Text type="secondary">Don&apos;t have an account?</Text>
              <Button onClick={() => navigate('/signup')}>Register</Button>
            </Space>
          </Col>
          <Col xs={24} md={14}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Title level={3} style={{ marginBottom: 0 }}>Login</Title>
              {error ? <Alert type="error" showIcon message={error} /> : null}
              <Form layout="vertical" onSubmitCapture={handleLogin}>
                <Form.Item label="Email" required>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(event) => {
                      if (error) setError('');
                      setForm((prev) => ({ ...prev, email: event.target.value }));
                    }}
                    autoComplete="email"
                  />
                </Form.Item>
                <Form.Item label="Password" required>
                  <Input.Password
                    placeholder="Password"
                    value={form.password}
                    onChange={(event) => {
                      if (error) setError('');
                      setForm((prev) => ({ ...prev, password: event.target.value }));
                    }}
                    autoComplete="current-password"
                  />
                </Form.Item>
                <Text type="secondary">Forgot password?</Text>
                <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" loading={isSubmitting} block>
                    Login
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

export default Login;
