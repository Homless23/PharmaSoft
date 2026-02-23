import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd';
import api from '../services/api';
import AppShell from '../components/AppShell';
import { useGlobalContext } from '../context/globalContext';
import { ACTIONS, hasPermission, normalizeRole } from '../config/rbacPolicy';
import { getApiError, getApiErrorMessage } from '../utils/apiError';

const roleOptions = ['user', 'cashier', 'pharmacist', 'admin'].map((role) => ({ label: role, value: role }));

const Admin = () => {
  const { Title, Text } = Typography;
  const { user, error, setError, showToast, pushNotification } = useGlobalContext();
  const [users, setUsers] = useState([]);
  const [logins, setLogins] = useState([]);
  const [overrideAudit, setOverrideAudit] = useState({ tokens: [], bills: [] });
  const [releaseReadiness, setReleaseReadiness] = useState(null);
  const [runningReleaseGate, setRunningReleaseGate] = useState(false);
  const [runningCompliance, setRunningCompliance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedPreset, setSeedPreset] = useState('medium');
  const [overrideIssueReason, setOverrideIssueReason] = useState('');
  const [overrideTtlMinutes, setOverrideTtlMinutes] = useState('10');
  const [overrideIssueLoading, setOverrideIssueLoading] = useState(false);
  const [issuedOverrideToken, setIssuedOverrideToken] = useState('');
  const [issuedOverrideExpiry, setIssuedOverrideExpiry] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const role = normalizeRole(user?.role);
  const currentUserId = String(user?._id || user?.id || '');
  const canManageUsers = hasPermission(role, ACTIONS.ADMIN_USERS_MANAGE);
  const canManageTransactions = hasPermission(role, ACTIONS.TRANSACTIONS_MANAGE);
  const canIssueOverrideTokens = normalizeRole(user?.role) === 'admin';

  const loadAdminData = useCallback(async () => {
    if (!canManageUsers) {
      setUsers([]);
      setLogins([]);
      setOverrideAudit({ tokens: [], bills: [] });
      setReleaseReadiness(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [usersRes, loginsRes, overrideRes, readinessRes] = await Promise.allSettled([
        api.get('/admin/users'),
        api.get('/admin/logins'),
        api.get('/admin/expired-overrides'),
        api.get('/admin/ops/release-readiness')
      ]);
      const usersPayload = usersRes.status === 'fulfilled' ? usersRes.value?.data : [];
      const loginsPayload = loginsRes.status === 'fulfilled' ? loginsRes.value?.data : [];
      const overridePayload = overrideRes.status === 'fulfilled' ? overrideRes.value?.data : {};
      const readinessPayload = readinessRes.status === 'fulfilled' ? readinessRes.value?.data : null;

      setUsers(Array.isArray(usersPayload) ? usersPayload : []);
      setLogins(Array.isArray(loginsPayload) ? loginsPayload : []);
      setOverrideAudit({
        tokens: Array.isArray(overridePayload?.tokens) ? overridePayload.tokens : [],
        bills: Array.isArray(overridePayload?.bills) ? overridePayload.bills : []
      });
      setReleaseReadiness(readinessPayload || null);

      const failures = [usersRes, loginsRes, overrideRes, readinessRes].filter((result) => result.status === 'rejected');
      if (failures.length > 0) {
        setError('Some admin sections failed to load. Showing available data.');
      }
    } catch (requestError) {
      setReleaseReadiness(null);
      setError(getApiErrorMessage(requestError, 'Failed to load admin data'));
    } finally {
      setLoading(false);
    }
  }, [canManageUsers, setError]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const createUser = async () => {
    if (!canManageUsers) {
      showToast('You do not have permission to manage users', { type: 'warning' });
      return;
    }
    try {
      setError(null);
      await api.post('/admin/users', {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role
      });
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      showToast('User created', { type: 'success' });
      pushNotification('Admin created a new user', { type: 'success' });
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to create user'));
    }
  };

  const removeUser = async (id) => {
    if (!canManageUsers) {
      showToast('You do not have permission to delete users', { type: 'warning' });
      return;
    }
    if (String(id) === currentUserId) {
      showToast('You cannot delete your own account', { type: 'warning' });
      return;
    }
    Modal.confirm({
      title: 'Delete this user?',
      onOk: async () => {
        try {
          setError(null);
          await api.delete(`/admin/users/${id}`);
          showToast('User deleted', { type: 'warning' });
          pushNotification('Admin deleted a user account', { type: 'warning' });
          await loadAdminData();
        } catch (requestError) {
          setError(getApiErrorMessage(requestError, 'Failed to delete user'));
        }
      }
    });
  };

  const changeUserRole = async (id, role) => {
    if (!canManageUsers) {
      showToast('You do not have permission to update roles', { type: 'warning' });
      return;
    }
    if (String(id) === currentUserId && String(role || '').toLowerCase() !== 'admin') {
      showToast('You cannot demote your own account', { type: 'warning' });
      return;
    }
    try {
      setError(null);
      await api.put(`/admin/users/${id}/role`, { role });
      showToast('User role updated', { type: 'success' });
      pushNotification(`Admin updated role for user ${id}`, { type: 'info' });
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update role'));
    }
  };

  const addRandomEntries = async () => {
    if (!canManageTransactions) {
      showToast('You do not have permission to seed entries', { type: 'warning' });
      return;
    }
    const presetConfig = {
      small: { outflowCount: 20, incomeCount: 6 },
      medium: { outflowCount: 45, incomeCount: 16 },
      large: { outflowCount: 120, incomeCount: 35 }
    };
    const selected = presetConfig[seedPreset] || presetConfig.medium;
    Modal.confirm({
      title: 'Add random test purchases and sales to this admin account?',
      onOk: async () => {
        try {
          setSeeding(true);
          setError(null);
          const res = await api.post('/admin/seed-random-entries', selected);
          const total = Number(res?.data?.totalAdded || 0);
          showToast(`Added ${total} random pharmacy entries`, { type: 'success' });
          pushNotification(`Admin seeded ${total} random pharmacy entries`, { type: 'info' });
          await loadAdminData();
        } catch (requestError) {
          setError(getApiErrorMessage(requestError, 'Failed to add random entries'));
        } finally {
          setSeeding(false);
        }
      }
    });
  };

  const issueExpiredOverrideToken = async () => {
    if (!canIssueOverrideTokens) {
      showToast('Only admin can issue override tokens', { type: 'warning' });
      return;
    }
    try {
      setOverrideIssueLoading(true);
      setError(null);
      const res = await api.post('/v1/bills/expired-override-token', {
        reason: overrideIssueReason.trim(),
        ttlMinutes: Number(overrideTtlMinutes) || 10
      });
      const token = String(res?.data?.token || '');
      const expiresAt = String(res?.data?.expiresAt || '');
      setIssuedOverrideToken(token);
      setIssuedOverrideExpiry(expiresAt);
      showToast('Override token issued', { type: 'success' });
      if (token && navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(token).catch(() => {});
      }
    } catch (requestError) {
      const apiError = getApiError(requestError, 'Failed to issue override token');
      setError(apiError.message);
      if (apiError.code === 'AUTH_RATE_LIMITED' || apiError.code === 'ADMIN_WRITE_RATE_LIMITED') {
        showToast(apiError.message, { type: 'warning' });
      }
    } finally {
      setOverrideIssueLoading(false);
    }
  };

  const runReleaseGateNow = async () => {
    if (!canManageUsers) return;
    try {
      setRunningReleaseGate(true);
      setError(null);
      const res = await api.post('/admin/ops/release-gate/run');
      const status = String(res?.data?.releaseGate?.status || '').toLowerCase();
      showToast(
        status === 'passed' ? 'Release gate passed' : 'Release gate finished with failures',
        { type: status === 'passed' ? 'success' : 'warning' }
      );
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to run release gate'));
    } finally {
      setRunningReleaseGate(false);
    }
  };

  const runComplianceNow = async () => {
    if (!canManageUsers) return;
    try {
      setRunningCompliance(true);
      setError(null);
      const res = await api.post('/admin/ops/compliance/run', { days: 365 });
      const criticalCount = Number(res?.data?.compliance?.criticalCount || 0);
      const warningCount = Number(res?.data?.compliance?.warningCount || 0);
      showToast(
        `Compliance refreshed (critical: ${criticalCount}, warnings: ${warningCount})`,
        { type: criticalCount > 0 ? 'warning' : 'success' }
      );
      await loadAdminData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to run compliance report'));
    } finally {
      setRunningCompliance(false);
    }
  };

  const userColumns = [
      { title: '#', key: 'index', render: (_, __, index) => index + 1 },
      { title: 'Username', dataIndex: 'name', key: 'name' },
      { title: 'Role', dataIndex: 'role', key: 'role' },
      {
        title: 'Joined',
        key: 'joined',
        render: (_, row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-')
      },
      { title: 'Email', dataIndex: 'email', key: 'email' },
      {
        title: 'Change Role',
        key: 'changeRole',
        render: (_, row) => (
          <Select
            value={row.role}
            options={roleOptions}
            style={{ width: 140 }}
            disabled={!canManageUsers || String(row._id) === currentUserId}
            onChange={(value) => changeUserRole(row._id, value)}
          />
        )
      },
      {
        title: 'Action',
        key: 'action',
        render: (_, row) => (
          <Button danger disabled={!canManageUsers || String(row._id) === currentUserId} onClick={() => removeUser(row._id)}>
            Delete
          </Button>
        )
      }
    ];

  return (
    <AppShell title="Admin & Operations" subtitle="User management, audit visibility, release readiness, and backup controls">
      {loading ? <Alert style={{ marginBottom: 16 }} type="info" message="Loading admin data..." showIcon /> : null}
      {error ? <Alert style={{ marginBottom: 16 }} type="error" message={error} showIcon /> : null}

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Title level={4} style={{ margin: 0 }}>Create User</Title>
            <Space wrap>
              <Select
                value={seedPreset}
                onChange={setSeedPreset}
                options={[
                  { value: 'small', label: 'Small (26)' },
                  { value: 'medium', label: 'Medium (61)' },
                  { value: 'large', label: 'Large (155)' }
                ]}
                style={{ width: 160 }}
                disabled={seeding || !canManageTransactions}
              />
              <Button onClick={addRandomEntries} loading={seeding} disabled={!canManageTransactions}>
                Add Random Entries
              </Button>
            </Space>
          </Space>

          <Form layout="vertical" onFinish={createUser} disabled={!canManageUsers}>
            <Row gutter={12}>
              <Col xs={24} md={6}>
                <Form.Item label="Name" required>
                  <Input value={newUser.name} onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="Email" required>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="Password" required>
                  <Input.Password value={newUser.password} onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item label="Role" required>
                  <Select value={newUser.role} options={roleOptions} onChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))} disabled={!canManageUsers} />
                </Form.Item>
              </Col>
              <Col xs={24} md={2} style={{ display: 'flex', alignItems: 'end' }}>
                <Button type="primary" htmlType="submit" block disabled={!canManageUsers}>Create</Button>
              </Col>
            </Row>
          </Form>
        </Space>
      </Card>

      <Card style={{ marginBottom: 16 }} title="Production Readiness">
        {releaseReadiness ? (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Space wrap>
              <Button
                type="primary"
                onClick={runReleaseGateNow}
                loading={runningReleaseGate}
                disabled={!canManageUsers || runningCompliance}
              >
                Run Release Gate
              </Button>
              <Button
                onClick={runComplianceNow}
                loading={runningCompliance}
                disabled={!canManageUsers || runningReleaseGate}
              >
                Refresh Compliance
              </Button>
            </Space>
            <Space wrap>
              <Tag color={releaseReadiness.status === 'ready' ? 'green' : (releaseReadiness.status === 'warning' ? 'gold' : 'red')}>
                {String(releaseReadiness.status || 'unknown').toUpperCase()}
              </Tag>
              <Text>Critical: {Number(releaseReadiness.criticalCount || 0)}</Text>
              <Text>Warnings: {Number(releaseReadiness.warningCount || 0)}</Text>
              <Text>Bills scanned: {Number(releaseReadiness.scannedBills || 0)}</Text>
            </Space>
            <Space wrap>
              <Text type="secondary">Last release gate:</Text>
              <Tag color={releaseReadiness?.releaseGate?.status === 'passed' ? 'green' : (releaseReadiness?.releaseGate?.status === 'failed' ? 'red' : 'default')}>
                {String(releaseReadiness?.releaseGate?.status || 'not_run').toUpperCase()}
              </Tag>
              <Text type="secondary">
                {releaseReadiness?.releaseGate?.generatedAt
                  ? new Date(releaseReadiness.releaseGate.generatedAt).toLocaleString()
                  : 'not available'}
              </Text>
            </Space>
            <Space wrap>
              <Text>Missing finalize audit: {Number(releaseReadiness?.checks?.missingFinalizeAudit || 0)}</Text>
              <Text>Duplicate invoices: {Number(releaseReadiness?.checks?.duplicateInvoiceGroups || 0)}</Text>
              <Text>Non-IRD invoices: {Number(releaseReadiness?.checks?.nonIrdInvoiceWarnings || 0)}</Text>
            </Space>
          </Space>
        ) : (
          <Text type="secondary">Readiness data not available.</Text>
        )}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>Issue Expired-Sale Override Token</Title>
          <Text type="secondary">Create a short-lived token for cashier expired-medicine override. Token is one-time use.</Text>
          <Row gutter={12}>
            <Col xs={24} md={10}>
              <Input value={overrideIssueReason} onChange={(e) => setOverrideIssueReason(e.target.value)} placeholder="Operational override reason" disabled={!canIssueOverrideTokens} />
            </Col>
            <Col xs={24} md={6}>
              <Input type="number" min={1} max={30} value={overrideTtlMinutes} onChange={(e) => setOverrideTtlMinutes(e.target.value)} disabled={!canIssueOverrideTokens} />
            </Col>
            <Col xs={24} md={8}>
              <Button type="primary" onClick={issueExpiredOverrideToken} loading={overrideIssueLoading} disabled={!canIssueOverrideTokens}>
                Issue Token
              </Button>
            </Col>
          </Row>
          {issuedOverrideToken ? (
            <Alert
              type="success"
              showIcon
              message={`Token: ${issuedOverrideToken}`}
              description={`Expires: ${issuedOverrideExpiry ? new Date(issuedOverrideExpiry).toLocaleString() : '-'}`}
            />
          ) : null}
        </Space>
      </Card>

      <Card style={{ marginBottom: 16 }} title="Users">
        <Table rowKey="_id" columns={userColumns} dataSource={users} pagination={{ pageSize: 8 }} />
      </Card>

      <Card style={{ marginBottom: 16 }} title="Expired Override Compliance">
        <Table
          rowKey="_id"
          style={{ marginBottom: 12 }}
          pagination={{ pageSize: 6 }}
          dataSource={overrideAudit.tokens}
          columns={[
            { title: 'Token Issued By', render: (_, item) => item?.issuedBy?.email || item?.issuedByEmail || '-' },
            { title: 'Issued At', render: (_, item) => (item?.createdAt ? new Date(item.createdAt).toLocaleString() : '-') },
            { title: 'Expires', render: (_, item) => (item?.expiresAt ? new Date(item.expiresAt).toLocaleString() : '-') },
            { title: 'Status', render: (_, item) => <Tag color={item?.usedAt ? 'green' : 'blue'}>{item?.usedAt ? 'Used' : 'Unused'}</Tag> },
            { title: 'Used By', render: (_, item) => item?.usedBy?.email || '-' },
            { title: 'Used For Bill', render: (_, item) => item?.usedForBill || '-' },
            { title: 'Reason', render: (_, item) => item?.reason || '-' }
          ]}
        />

        <Table
          rowKey="_id"
          pagination={{ pageSize: 6 }}
          dataSource={overrideAudit.bills}
          columns={[
            { title: 'Bill', dataIndex: 'billNumber', key: 'billNumber' },
            { title: 'Date', render: (_, item) => (item.billDate ? new Date(item.billDate).toLocaleString() : '-') },
            { title: 'Customer', render: (_, item) => item.customerName || 'Walk-in Customer' },
            { title: 'Total', render: (_, item) => `Rs.${Math.round(Number(item.grandTotal || 0)).toLocaleString()}` },
            { title: 'Approved By', render: (_, item) => item?.expiredOverride?.approvedBy?.email || item?.expiredOverride?.approvedByEmail || '-' },
            { title: 'Reason', render: (_, item) => item?.expiredOverride?.reason || '-' },
            { title: 'Lines', render: (_, item) => (Array.isArray(item?.expiredOverride?.lines) ? item.expiredOverride.lines.length : 0) }
          ]}
        />
      </Card>

      <Card title="Login Activity">
        <Table
          rowKey="_id"
          dataSource={logins}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Email', dataIndex: 'email', key: 'email' },
            { title: 'Status', render: (_, item) => <Tag color={item.success ? 'green' : 'red'}>{item.success ? 'Success' : 'Failed'}</Tag> },
            { title: 'Role', dataIndex: 'role', key: 'role' },
            { title: 'IP', render: (_, item) => item.ip || '-' },
            { title: 'Time', render: (_, item) => (item.createdAt ? new Date(item.createdAt).toLocaleString() : '-') }
          ]}
        />
      </Card>
    </AppShell>
  );
};

export default Admin;
