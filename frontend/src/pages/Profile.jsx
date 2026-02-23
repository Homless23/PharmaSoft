import React, { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Card, Col, Form, Input, Row, Space, Typography } from 'antd';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';

const Profile = () => {
  const { Title, Text } = Typography;
  const {
    user,
    error,
    loading,
    getCurrentUser,
    updateProfile,
    updatePassword
  } = useGlobalContext();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [profile, setProfile] = useState({ name: '', email: '', createdAt: '' });
  const [nameInput, setNameInput] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [localError, setLocalError] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setIsPageLoading(true);
      const result = await getCurrentUser();
      if (result.success && result.data) {
        setProfile({
          name: result.data.name || '',
          email: result.data.email || '',
          createdAt: result.data.createdAt || ''
        });
        setNameInput(result.data.name || '');
      } else if (user) {
        setProfile({
          name: user.name || '',
          email: user.email || '',
          createdAt: ''
        });
        setNameInput(user.name || '');
      }
      setIsPageLoading(false);
    };

    loadProfile();
  }, [getCurrentUser, user]);

  const onSaveProfile = async (event) => {
    event.preventDefault();
    setLocalError('');
    const cleaned = String(nameInput || '').trim();
    if (!cleaned) return;

    setIsSavingName(true);
    const payload = {
      name: cleaned
    };
    const result = await updateProfile(payload);
    setIsSavingName(false);
    if (!result.success) return;
    setProfile((prev) => ({
      ...prev, name: cleaned
    }));
  };

  const onSavePassword = async (event) => {
    event.preventDefault();
    setLocalError('');
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setLocalError('Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('New password and confirm password do not match.');
      return;
    }

    setIsSavingPassword(true);
    const result = await updatePassword({ currentPassword, newPassword });
    setIsSavingPassword(false);
    if (!result.success) return;
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };
  const profileInitial = String(nameInput || profile.name || user?.name || 'U').trim().charAt(0).toUpperCase() || 'U';

  return (
    <AppShell
      title="Profile"
      subtitle="Manage account details and security settings"
    >
      {(loading || isPageLoading) ? <Alert style={{ marginBottom: 16 }} type="info" showIcon message="Loading profile..." /> : null}
      {(error || localError) ? <Alert style={{ marginBottom: 16 }} type="error" showIcon message={localError || error} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card>
            <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
              <Avatar size={72}>{profileInitial}</Avatar>
              <Title level={4} style={{ margin: 0 }}>{profile.name || 'User'}</Title>
              <Text type="secondary">{profile.email || '-'}</Text>
              <Text type="secondary">
                Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently'}
              </Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card title="Account">
              <Form layout="vertical" onSubmitCapture={onSaveProfile}>
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Display Name" required>
                      <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Email">
                      <Input value={profile.email} disabled />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="primary" htmlType="submit" loading={isSavingName}>Save Changes</Button>
              </Form>
            </Card>

            <Card title="Security">
              <Form layout="vertical" onSubmitCapture={onSavePassword}>
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Current Password" required>
                      <Input.Password
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="New Password" required>
                      <Input.Password
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Confirm Password" required>
                      <Input.Password
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="primary" htmlType="submit" loading={isSavingPassword}>Update Password</Button>
              </Form>
            </Card>
          </Space>
        </Col>
      </Row>
    </AppShell>
  );
};

export default Profile;
