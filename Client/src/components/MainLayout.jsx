import React, { useState } from 'react';
import Sidebar from './Sidebar';
import AddTransactionModal from './AddTransactionModal';

const MainLayout = ({ children }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const layoutStyles = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-app)',
  };

  const contentStyles = {
    flex: 1,
    marginLeft: '260px',
    padding: '40px',
    paddingBottom: '100px',
    transition: 'all 0.3s ease',
    position: 'relative'
  };

  return (
    <div style={layoutStyles}>
      <Sidebar />
      <main style={contentStyles}>
        {children}
      </main>

      {/* Floating Add Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          padding: '14px 28px',
          borderRadius: '50px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '0 12px 32px rgba(102, 126, 234, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '1rem',
          fontWeight: '600',
          transition: 'all 0.3s ease',
          zIndex: 999
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.08)';
          e.target.style.boxShadow = '0 16px 40px rgba(102, 126, 234, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.4)';
        }}
        title="Add Transaction"
      >
        <span>✨</span>
        <span>Add Transaction</span>
      </button>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default MainLayout;