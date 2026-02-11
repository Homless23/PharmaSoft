import React, { useState, useContext } from 'react';
import Sidebar from './Sidebar';
import Modal from './Modal';
import AddTransaction from './AddTransaction'; // Re-importing form for the modal
import { GlobalContext } from '../context/GlobalState';

const MainLayout = ({ children }) => {
  const { user } = useContext(GlobalContext);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false); // New State

  return (
    <div className="app-shell">
      {/* 1. Mobile Overlay (Click to close) */}
      <div 
        className={`mobile-overlay ${isMobileNavOpen ? 'active' : ''}`}
        onClick={() => setMobileNavOpen(false)}
      />

      {/* 2. Sidebar (Passed state) */}
      <Sidebar 
        isOpen={isMobileNavOpen} 
        onClose={() => setMobileNavOpen(false)} 
      />

      {/* 3. Main Content Area */}
      <main className="main-content">
        <header className="top-header">
          
          {/* HAMBURGER BUTTON (Visible only on Mobile) */}
          <button 
            className="hamburger-btn" 
            onClick={() => setMobileNavOpen(true)}
          >
            ☰
          </button>

          <h2 className="page-title">Overview</h2>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn-primary desktop-only-btn" onClick={() => setModalOpen(true)}>+ Add</button>
            {/* Mobile "+" Icon */}
            <button className="btn-primary mobile-only-btn" onClick={() => setModalOpen(true)}>+</button>
            
            <div className="user-profile-pill">
              <div className="avatar">{user ? user.name.charAt(0) : 'U'}</div>
              <span className="username desktop-only-text">{user ? user.name : ''}</span>
            </div>
          </div>
        </header>

        <div className="content-scrollable">
          {children}
        </div>

        {/* Global Modal */}
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