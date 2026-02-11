import React from 'react';

const Layout = ({ children }) => {
  return (
    <>
      <header className="main-header">
        <div className="container">
          <nav className="navbar">
            <span className="logo">ExpenseTracker<strong>Pro</strong></span>
            {/* Auth links will go here in Phase 8 */}
          </nav>
        </div>
      </header>
      <main className="container fade-in">
        {children}
      </main>
      <footer className="main-footer">
        <p>&copy; 2026 Expense Tracker Pro. Secure & Encrypted.</p>
      </footer>
    </>
  );
};

export default Layout;