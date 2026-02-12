import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { GlobalContext } from '../context/GlobalState';

const Sidebar = () => {
  const { logout, user } = useContext(GlobalContext);

  const styles = {
    container: {
      width: '260px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      zIndex: 100
    },
    logo: {
      fontSize: '1.5rem',
      fontWeight: 800,
      color: 'var(--primary)',
      marginBottom: '40px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    navGroup: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
    link: {
      padding: '12px 16px',
      borderRadius: '12px',
      textDecoration: 'none',
      color: 'var(--text-secondary)',
      fontSize: '0.95rem',
      fontWeight: 500,
      transition: 'all 0.2s'
    },
    activeLink: {
      background: 'var(--primary-glow)',
      color: 'var(--primary)',
      fontWeight: 700
    },
    userSection: {
      paddingTop: '20px',
      borderTop: '1px solid var(--border-subtle)',
      marginTop: 'auto'
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Transactions', path: '/transactions', icon: '💸' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'History', path: '/history', icon: '📜' },
    { name: 'Settings', path: '/settings', icon: '⚙️' }
  ];

  return (
    <aside style={styles.container}>
      <div style={styles.logo}>
        <div style={{ padding: '8px', background: 'var(--primary)', color: 'white', borderRadius: '8px' }}>ET</div>
        <span>ExpensePro</span>
      </div>

      <nav style={styles.navGroup}>
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            style={({ isActive }) => isActive ? { ...styles.link, ...styles.activeLink } : styles.link}
          >
            <span style={{ marginRight: '12px' }}>{item.icon}</span>
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div style={styles.userSection}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Signed in as</p>
        <p style={{ fontWeight: 600, marginBottom: '16px' }}>{user?.name || 'Loading...'}</p>
        <button 
          onClick={logout}
          style={{ 
            width: '100%', padding: '10px', background: 'transparent', 
            border: '1px solid #ef4444', color: '#ef4444', 
            borderRadius: '8px', cursor: 'pointer', fontWeight: 600 
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;