import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { GlobalContext } from '../context/GlobalState';

// Now accepts "isOpen" and "onClose" props
const Sidebar = ({ isOpen, onClose }) => {
  const { logout } = useContext(GlobalContext);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
    { path: '/history', label: 'Transactions', icon: '📝' },
    { path: '/budget', label: 'Budgets', icon: '💰' },
    { path: '/profile', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <>
      {/* The Sidebar Container - Dynamic Class based on isOpen */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        
        {/* Header with Close Button for Mobile */}
        <div className="sidebar-header">
          <div className="logo-flex">
            <div className="logo-icon">ET</div>
            <span className="logo-text">Expense<span className="text-primary">Pro</span></span>
          </div>
          {/* Mobile Close X Button */}
          <button className="mobile-close-btn" onClick={onClose}>&times;</button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              onClick={onClose} // Close sidebar when link is clicked
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">
            <span className="nav-icon">🚪</span>
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;