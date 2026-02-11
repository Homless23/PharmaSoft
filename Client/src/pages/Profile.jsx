import React, { useContext, useState } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Profile = () => {
  const { user, logout, transactions } = useContext(GlobalContext);
  const [currency, setCurrency] = useState('NPR');

  // Derived Stats
  const totalVolume = transactions.reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const transactionCount = transactions.length;

  return (
    <div className="container profile-page">
      <div className="profile-grid">
        {/* Left Column: Identity Card */}
        <div className="profile-column">
          <div className="card identity-card">
            <div className="avatar-large">
              {user ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h3 className="user-full-name">{user ? user.name : 'User Name'}</h3>
            <p className="text-muted text-sm">{user ? user.email : 'user@example.com'}</p>
            <div className="badge-verified">Verified Account</div>
          </div>

          <div className="card stats-mini-grid">
            <div className="stat-item">
              <span className="text-muted text-sm">Total Volume</span>
              <p className="font-bold">Rs {totalVolume.toLocaleString()}</p>
            </div>
            <div className="stat-item">
              <span className="text-muted text-sm">Activities</span>
              <p className="font-bold">{transactionCount}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Preferences */}
        <div className="profile-column wide">
          <div className="card settings-card">
            <h3 className="card-label">Financial Preferences</h3>
            
            <div className="setting-control-row">
              <div className="control-label">
                <span className="font-bold">Primary Currency</span>
                <p className="text-muted text-sm">Global display currency for all metrics</p>
              </div>
              <select 
                className="filter-select" 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="NPR">Nepalese Rupee (Rs)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>

            <div className="setting-control-row">
              <div className="control-label">
                <span className="font-bold">Email Notifications</span>
                <p className="text-muted text-sm">Monthly spending summaries and budget alerts</p>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="card security-card">
            <h3 className="card-label">Security & Session</h3>
            <div className="setting-control-row">
              <div className="control-label">
                <span className="font-bold">Active Session</span>
                <p className="text-muted text-sm">Authenticated via Secure JWT</p>
              </div>
              <button onClick={logout} className="logout-btn" style={{width: 'auto', padding: '10px 20px'}}>
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;