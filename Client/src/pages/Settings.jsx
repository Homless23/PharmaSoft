import React, { useContext, useState, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Settings = () => {
  const { user, updateDetails, updatePassword, deleteAccount, logs, getLogs } = useContext(GlobalContext);
  const [details, setDetails] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    getLogs();
  }, []);

  const onDetailSubmit = (e) => { e.preventDefault(); updateDetails(details); };
  const onPasswordSubmit = (e) => { e.preventDefault(); updatePassword(passwords); setPasswords({currentPassword: '', newPassword: ''}); };

  return (
    <div className="settings-page">
      <div className="settings-grid-premium">
        <div className="settings-main">
          <div className="card">
            <h3 className="card-label">Identity & Security</h3>
            <form onSubmit={onDetailSubmit} className="settings-form">
                <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" value={details.name} onChange={(e) => setDetails({...details, name: e.target.value})} />
                </div>
                <button type="submit" className="btn-primary">Save Changes</button>
            </form>
          </div>

          {/* New Security Log Section */}
          <div className="card" style={{ marginTop: '24px' }}>
            <h3 className="card-label">Recent Security Activity</h3>
            <div className="log-list">
              {logs.map(log => (
                <div key={log._id} className="log-item">
                  <span className={`log-badge ${log.action.includes('FAILURE') ? 'fail' : 'pass'}`}>
                    {log.action.replace('_', ' ')}
                  </span>
                  <span className="log-date">{new Date(log.createdAt).toLocaleString()}</span>
                  <span className="log-ip text-muted">{log.ipAddress}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-side">
            <div className="card danger-card">
              <h3 className="card-label text-danger">Danger Zone</h3>
              <button className="btn-danger-outline" onClick={() => window.confirm('Delete?') && deleteAccount()}>Delete Account</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;