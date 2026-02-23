import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Result, Space } from 'antd';
import { useGlobalContext } from '../context/globalContext';
import { ACTIONS, hasPermission, normalizeRole } from '../config/rbacPolicy';

const getDefaultRouteForRole = (user) => {
  const role = normalizeRole(user?.role);
  if (hasPermission(role, ACTIONS.BILLING_ACCESS)) return '/billing';
  if (hasPermission(role, ACTIONS.TRANSACTIONS_MANAGE)) return '/dashboard';
  return '/profile';
};

const AccessDenied = () => {
  const navigate = useNavigate();
  const { user } = useGlobalContext();

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 760 }}>
        <Result
          status="403"
          title="Access Denied"
          subTitle="Your account does not have permission to view this page."
          extra={(
            <Space>
              <Button onClick={() => navigate(-1)}>Go Back</Button>
              <Button type="primary" onClick={() => navigate(getDefaultRouteForRole(user))}>
                Go To Home
              </Button>
            </Space>
          )}
        />
      </Card>
    </div>
  );
};

export default AccessDenied;
