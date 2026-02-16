import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiBell, FiCreditCard, FiDollarSign, FiFileText, FiGrid, FiLayers } from 'react-icons/fi';
import { useGlobalContext } from '../context/globalContext';

const AppShell = ({ title, subtitle, children, rightPanel = null }) => {
  const navigate = useNavigate();
  const { user, expenses, notifications, markNotificationsRead, logoutUser } = useGlobalContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const navItems = useMemo(() => {
    const base = [
      { to: '/dashboard', label: 'Dashboard', icon: <FiGrid /> },
      { to: '/transactions', label: 'Transactions', icon: <FiCreditCard /> },
      { to: '/add', label: 'Add Expense', icon: <FiDollarSign /> },
      { to: '/budget', label: 'Budget', icon: <FiBarChart2 /> },
      { to: '/categories', label: 'Categories', icon: <FiLayers /> },
      { to: '/reports', label: 'Reports', icon: <FiFileText /> }
    ];
    if (user?.role === 'admin') {
      base.push({ to: '/admin', label: 'Admin', icon: <FiLayers /> });
    }
    return base;
  }, [user?.role]);

  const initials = useMemo(() => {
    const rawName = String(user?.name || '').trim();
    if (!rawName) return 'U';
    const parts = rawName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [user]);

  const todayAlerts = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return expenses.filter((item) => {
      if ((item.type || 'expense') !== 'expense') return false;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return false;
      return date.toISOString().slice(0, 10) === todayKey;
    }).length;
  }, [expenses]);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );
  const latestNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="dashboard-ui-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">EXPENSE TRACKER</div>
        <nav className="dashboard-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `dashboard-nav-link ${isActive ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="dashboard-topbar-right">
            <div className="notif-chip" title="Today alerts">
              <span className="notif-dot" />
              {todayAlerts}
            </div>
            <div className="profile-menu-wrap" ref={notifRef}>
              <button
                type="button"
                className="profile-menu-trigger bell-trigger"
                onClick={() => {
                  setIsNotifOpen((prev) => {
                    const next = !prev;
                    if (next) markNotificationsRead();
                    return next;
                  });
                }}
                aria-haspopup="menu"
                aria-expanded={isNotifOpen}
                title="Notifications"
              >
                <FiBell />
                {unreadCount > 0 ? <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
              </button>
              {isNotifOpen ? (
                <div className="profile-dropdown notif-dropdown" role="menu">
                  <div className="notif-dropdown-head">Notifications</div>
                  {latestNotifications.length ? latestNotifications.map((item) => (
                    <div key={item.id} className="notif-item">
                      <p>{item.message}</p>
                      <small>{new Date(item.createdAt).toLocaleString()}</small>
                    </div>
                  )) : <div className="notif-item empty">No notifications yet</div>}
                </div>
              ) : null}
            </div>
            <div className="profile-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="profile-menu-trigger"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              >
                <div className="user-chip">
                  <strong>{initials}</strong>
                  <div>
                    <span>{user?.name || 'User'}</span>
                    <small>User</small>
                  </div>
                </div>
              </button>

              {isMenuOpen ? (
                <div className="profile-dropdown" role="menu">
                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      navigate('/profile');
                      setIsMenuOpen(false);
                    }}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    className="profile-dropdown-item danger"
                    onClick={() => {
                      setIsMenuOpen(false);
                      logoutUser();
                    }}
                  >
                    Log Out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className={`dashboard-content-grid ${rightPanel ? 'with-right-panel' : ''}`}>
          <main>{children}</main>
          {rightPanel ? <aside>{rightPanel}</aside> : null}
        </div>
      </section>
    </div>
  );
};

export default AppShell;
