import React from 'react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  const layoutStyles = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-app)', // Still using CSS variables for theme consistency
  };

  const contentStyles = {
    flex: 1,
    marginLeft: '260px', // Matches your sidebar width
    padding: '40px',
    transition: 'all 0.3s ease',
  };

  return (
    <div style={layoutStyles}>
      <Sidebar />
      <main style={contentStyles}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;