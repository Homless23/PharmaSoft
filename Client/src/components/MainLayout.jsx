import React, { useState, useContext } from 'react';
import Sidebar from './Sidebar';
import Modal from './Modal';
import AddTransaction from './AddTransaction';
import Notification from './Notification';
import { GlobalContext } from '../context/GlobalState';

const MainLayout = ({ children }) => {
  const { user } = useContext(GlobalContext);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <Notification />
      
      {/* Mobile Backdrop */}
      <div 
        className={`mobile-overlay ${isMobileNavOpen ? 'active' : ''}`}
        onClick={() => setMobileNavOpen(false)}
      />

      <Sidebar 
        isOpen={isMobileNavOpen} 
        onClose={() => setMobileNavOpen(false)} 
      />

      <main className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button 
              className="hamburger-btn" 
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open Menu"
            >
              ☰
            </button>
            <h2 className="page-title">Fintech Command Center</h2>
          </div>
          
          <div className="header-actions">
            <button className="btn-primary desktop-only-btn" onClick={() => setModalOpen(true)}>
              + Add Transaction
            </button>
            <button className="btn-primary mobile-only-btn" onClick={() => setModalOpen(true)}>
              +
            </button>
            
            <div className="user-profile-pill">
              <div className="avatar">{user ? user.name.charAt(0) : 'U'}</div>
              <span className="username desktop-only-text">{user ? user.name : 'User'}</span>
            </div>
          </div>
        </header>

        <div className="content-scrollable">
          {children}
        </div>

        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setModalOpen(false)} 
          title="New Transaction"
        >
          <AddTransaction onSuccess={() => setModalOpen(false)} />
        </Modal>
      </main>
    </div>
  );
};

export default MainLayout;