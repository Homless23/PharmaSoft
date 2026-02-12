import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GlobalContext } from '../context/GlobalState';

const Navbar = () => {
  const { logout, user } = useContext(GlobalContext);
  const location = useLocation();

  // Helper to highlight active link
  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className="main-nav">
      <div className="nav-logo">
        ExpenseTracker <span className="pro-tag">Pro</span>
      </div>
      <div className="nav-links">
        <Link to="/" className={isActive('/')}>Dashboard</Link>
        <Link to="/history" className={isActive('/history')}>History</Link>
        <Link to="/analytics" className={isActive('/analytics')}>Analytics</Link>
        <Link to="/profile" className={isActive('/profile')}>Profile</Link>
      </div>
      <div className="nav-auth">
        <span className="user-name">{user?.name}</span>
        <button onClick={logout} className="btn-logout-small">Log Out</button>
      </div>
    </nav>
  );
};

export default Navbar;