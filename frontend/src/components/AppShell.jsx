import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Input,
  Layout,
  List,
  Menu,
  Switch,
  Tag,
  Typography
} from 'antd';
import {
  BarChartOutlined,
  BellOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  SettingOutlined,
  WarningOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useGlobalContext } from '../context/globalContext';
import { getInitials } from '../utils/avatar';
import { ACTIONS, hasPermission, normalizeRole } from '../config/rbacPolicy';

const getDefaultRouteForRole = (user) => {
  const role = normalizeRole(user?.role);
  if (hasPermission(role, ACTIONS.BILLING_ACCESS)) return '/billing';
  if (hasPermission(role, ACTIONS.TRANSACTIONS_MANAGE)) return '/dashboard';
  return '/profile';
};

const AppShell = ({ title, subtitle, children, rightPanel = null }) => {
  const { Header, Sider, Content } = Layout;
  const { Title, Text } = Typography;
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, transactions, notifications, markNotificationsRead, logoutUser } = useGlobalContext();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [globalLookup, setGlobalLookup] = useState('');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('theme_dark') === 'true';
    } catch {
      return false;
    }
  });
  const notifRef = useRef(null);
  const navItems = useMemo(() => {
    const role = normalizeRole(user?.role);
    const items = [];
    if (hasPermission(role, ACTIONS.TRANSACTIONS_MANAGE)) {
      items.push({ key: '/dashboard', to: '/dashboard', label: 'Dashboard', icon: <BarChartOutlined /> });
      items.push({ key: '/sales-history', to: '/sales-history', label: 'Sales & Purchase History', icon: <CreditCardOutlined /> });
    }
    if (hasPermission(role, ACTIONS.BILLING_ACCESS)) {
      items.push({ key: '/billing', to: '/billing', label: 'Billing', icon: <DollarOutlined /> });
    }
    if (hasPermission(role, ACTIONS.MEDICINE_WRITE)) {
      items.push({ key: '/medicine-master', to: '/medicine-master', label: 'Medicine Master', icon: <UserOutlined /> });
      items.push({ key: '/inventory', to: '/inventory', label: 'Inventory & Batches', icon: <TeamOutlined /> });
    }
    if (hasPermission(role, ACTIONS.STOCK_MANAGE)) {
      items.push({ key: '/purchases', to: '/purchases', label: 'Purchases', icon: <ShoppingOutlined /> });
    }
    if (hasPermission(role, ACTIONS.MEDICINE_VIEW)) {
      items.push({ key: '/stock-alerts', to: '/stock-alerts', label: 'Expiry & Low Stock', icon: <WarningOutlined /> });
    }
    if (hasPermission(role, ACTIONS.REPORTS_VIEW_PROFIT)) {
      items.push({ key: '/reports', to: '/reports', label: 'Profit Reports', icon: <FileTextOutlined /> });
    }
    if (hasPermission(role, ACTIONS.SETTINGS_MANAGE)) {
      items.push({ key: '/settings', to: '/settings', label: 'Settings', icon: <SettingOutlined /> });
    }
    if (hasPermission(role, ACTIONS.ADMIN_USERS_MANAGE)) items.push({ key: '/admin', to: '/admin', label: 'Admin', icon: <TeamOutlined /> });
    return items;
  }, [user?.role]);
  const menuItems = useMemo(
    () => navItems.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: <NavLink to={item.to}>{item.label}</NavLink>
    })),
    [navItems]
  );

  const initials = useMemo(() => getInitials(user?.name || 'User'), [user?.name]);
  const roleLabel = useMemo(() => {
    const role = normalizeRole(user?.role);
    if (!role) return 'user';
    return role;
  }, [user?.role]);

  const todayAlerts = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return transactions.filter((item) => {
      if ((item.type || 'outflow') === 'income') return false;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return false;
      return date.toISOString().slice(0, 10) === todayKey;
    }).length;
  }, [transactions]);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );
  const latestNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }
    localStorage.setItem('theme_dark', String(isDarkMode));
  }, [isDarkMode]);

  const onGlobalLookup = (value) => {
    const query = String(value || '').trim();
    const role = normalizeRole(user?.role);
    if (!query) return;
    if (hasPermission(role, ACTIONS.MEDICINE_VIEW)) {
      navigate(`/inventory?q=${encodeURIComponent(query)}`);
      return;
    }
    if (hasPermission(role, ACTIONS.BILLING_ACCESS)) {
      navigate('/billing');
      return;
    }
    navigate(getDefaultRouteForRole(user));
  };

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={!isDesktop ? true : collapsed}
        onCollapse={(value) => setCollapsed(value)}
        style={{ background: '#0f172a', position: 'sticky', top: 0, left: 0, height: '100vh' }}
      >
        <div style={{ color: '#fff', fontWeight: 700, padding: '16px', textAlign: 'center' }}>
          PHARMACY MANAGEMENT
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Drawer
        placement="left"
        open={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        bodyStyle={{ padding: 0 }}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      </Drawer>

      <Layout>
        <Header
          className="appshell-header"
          style={{
            background: '#fff',
            padding: '10px 14px',
            height: 'auto',
            minHeight: 64,
            lineHeight: 1.2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 20
          }}
        >
          <div className="appshell-header-left" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {isDesktop ? (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((prev) => !prev)}
              />
            ) : (
              <Button type="text" icon={<MenuUnfoldOutlined />} onClick={() => setIsMobileSidebarOpen(true)} />
            )}
            <div style={{ minWidth: 0 }}>
              <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>{title}</Title>
              {subtitle ? <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>{subtitle}</Text> : null}
            </div>
          </div>

          <div className="appshell-header-center">
            <Input.Search
              allowClear
              value={globalLookup}
              onChange={(e) => setGlobalLookup(e.target.value)}
              onSearch={onGlobalLookup}
              placeholder="Global search: medicine / SKU / patient"
              className="appshell-global-search"
            />
          </div>

          <div className="appshell-header-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge count={todayAlerts} color="#f5222d" />
            <Switch
              checked={isDarkMode}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              onChange={(checked) => setIsDarkMode(checked)}
            />

            <Dropdown
              open={isNotifOpen}
              onOpenChange={(next) => {
                setIsNotifOpen(next);
                if (next) markNotificationsRead();
              }}
              dropdownRender={() => (
                <div ref={notifRef} style={{ width: 320, maxHeight: 360, overflow: 'auto', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                  <div style={{ padding: '10px 12px', fontWeight: 600 }}>Notifications</div>
                  <List
                    size="small"
                    dataSource={latestNotifications}
                    locale={{ emptyText: 'No notifications yet' }}
                    renderItem={(item) => (
                      <List.Item style={{ padding: '8px 12px' }}>
                        <List.Item.Meta
                          title={<span>{item.message}</span>}
                          description={new Date(item.createdAt).toLocaleString()}
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )}
              trigger={['click']}
            >
              <Badge count={unreadCount} size="small">
                <Button type="text" icon={<BellOutlined />} />
              </Badge>
            </Dropdown>

            <Dropdown
              menu={{
                items: [
                  { key: 'profile', label: 'Profile', onClick: () => navigate('/profile') },
                  { key: 'logout', label: 'Log Out', onClick: () => logoutUser() }
                ]
              }}
              trigger={['click']}
            >
              <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar>{initials || <UserOutlined />}</Avatar>
                {isDesktop ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span>{user?.name || 'User'}</span>
                    <Tag color="blue" style={{ marginRight: 0, textTransform: 'uppercase' }}>{roleLabel}</Tag>
                  </span>
                ) : null}
              </Button>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 16, overflow: 'auto', minHeight: 0 }}>
          <div className={`dashboard-content-grid ${rightPanel ? 'with-right-panel' : ''}`}>
            <main>{children}</main>
            {rightPanel ? <aside>{rightPanel}</aside> : null}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppShell;

