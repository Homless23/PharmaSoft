import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Input, Row, Space, Typography } from 'antd';
import { useGlobalContext } from '../context/globalContext';
import api from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { Title, Text } = Typography;
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
      if (payload.role !== 'admin' || !payload?._id) {
        throw new Error('Invalid admin login response');
      }
      setUser(payload);
      navigate('/admin');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Admin login failed'));
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
              <Title level={2} style={{ marginBottom: 0 }}>Admin Access</Title>
              <Text type="secondary">Restricted control panel</Text>
            </Space>
          </Col>
          <Col xs={24} md={14}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Title level={3} style={{ marginBottom: 0 }}>Admin Login</Title>
              {error ? <Alert type="error" showIcon message={error} /> : null}
              <Form layout="vertical" onSubmitCapture={onSubmit}>
                <Form.Item label="Admin Email" required>
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
                <Form.Item style={{ marginBottom: 0 }}>
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

export default AdminLogin;
