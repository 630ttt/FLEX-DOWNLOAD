import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUser,
  FaLock,
  FaEnvelope,
  FaShieldAlt,
  FaSave,
  FaKey,
  FaTimes,
  FaCheck,
  FaCog,
  FaUserCog,
} from 'react-icons/fa';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import './AdminProfileSettings.css';

const emptyProfile = { name: '', username: '', role: '', createdAt: '' };
const emptyPassword = { currentPassword: '', newPassword: '', confirmPassword: '' };

const AdminProfileSettings = () => {
  const { admin, updateAdmin } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(emptyProfile);
  const [profileForm, setProfileForm] = useState({ name: '', username: '' });
  const [passwordForm, setPasswordForm] = useState(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/profile');
      const adminData = res.data;
      const nextProfile = {
        name: adminData.name,
        username: adminData.username,
        role: adminData.role,
        createdAt: adminData.createdAt,
      };
      setProfile(nextProfile);
      setProfileForm({ name: adminData.name, username: adminData.username });
    } catch (err) {
      setError(err.message || 'Unable to load admin profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      setSaving(true);
      const res = await api.put('/admin/profile', {
        name: profileForm.name,
        username: profileForm.username,
      });

      if (res.token && res.admin) {
        updateAdmin(res.admin, res.token);
      }

      const nextProfile = {
        name: res.admin.name,
        username: res.admin.username,
        role: res.admin.role,
        createdAt: profile.createdAt,
      };

      setProfile(nextProfile);
      setProfileForm({ name: res.admin.name, username: res.admin.username });
      setMessage('Admin profile updated successfully');
    } catch (err) {
      setError(err.message || 'Unable to update profile');
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      setPasswordSaving(true);
      await api.put('/admin/profile/password', passwordForm);
      setPasswordForm(emptyPassword);
      setMessage('Password changed successfully');
    } catch (err) {
      setError(err.message || 'Unable to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return 'Unknown';
    return new Date(value).toLocaleString();
  };

  return (
    <div className="admin-profile-settings-page">
      <section className="admin-profile-header">
        <div className="admin-profile-heading">
          <span className="admin-profile-kicker"><FaCog /> Admin Settings</span>
          <h1 className="section-title">Admin Profile</h1>
          <p className="section-subtitle">Manage your account, username, and password securely.</p>
        </div>
        <button className="btn btn-primary admin-back-btn" onClick={() => navigate('/admin/dashboard')}>
          <FaTimes /> Back to Dashboard
        </button>
      </section>

      {error && <div className="admin-profile-error">{error}</div>}
      {message && <div className="admin-profile-success">{message}</div>}

      {loading ? (
        <div className="admin-profile-loader"><span className="loader-spine"></span></div>
      ) : (
        <div className="admin-profile-grid">
          <section className="admin-profile-card profile-summary-card">
            <div className="admin-profile-avatar-wrap">
              <div className="admin-profile-avatar">
                {(profile.name || admin?.name || 'A').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="admin-profile-summary-content">
              <span className="admin-profile-label">Current Admin</span>
              <h2>{profile.name || 'Administrator'}</h2>
              <div className="admin-profile-meta">
                <span><FaUser /> {profile.username}</span>
                <span><FaShieldAlt /> {profile.role}</span>
              </div>
              <div className="admin-profile-meta">
                <span><FaEnvelope /> Joined {formatDate(profile.createdAt)}</span>
              </div>
            </div>
          </section>

          <section className="admin-profile-card profile-form-card">
            <div className="admin-profile-card-head">
              <span><FaUserCog /> Profile Information</span>
              <span className="admin-profile-card-status">Admin Record</span>
            </div>
            <form className="admin-profile-form" onSubmit={updateProfile}>
              <div className="admin-profile-form-row">
                <label>
                  Full Name
                  <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
                </label>
                <label>
                  Username
                  <input value={profileForm.username} onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })} required />
                </label>
              </div>
              <div className="admin-profile-form-row">
                <label>
                  Role
                  <input value={profile.role} readOnly />
                </label>
                <label>
                  Updated At
                  <input value={formatDate(profile.createdAt)} readOnly />
                </label>
              </div>
              <div className="admin-profile-form-actions">
                <button type="button" className="btn btn-secondary" onClick={loadProfile}>Reset</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <FaSave /> {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </section>

          <section className="admin-profile-card password-form-card">
            <div className="admin-profile-card-head">
              <span><FaKey /> Change Password</span>
              <span className="admin-profile-card-status secure">Security</span>
            </div>
            <form className="admin-profile-form" onSubmit={updatePassword}>
              <div className="admin-profile-form-row password-stack">
                <label>
                  Current Password
                  <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                </label>
                <label>
                  New Password
                  <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength="6" />
                </label>
                <label>
                  Confirm Password
                  <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required minLength="6" />
                </label>
              </div>
              <div className="admin-profile-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setPasswordForm(emptyPassword)}>Clear</button>
                <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                  <FaLock /> {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>

          <section className="admin-profile-card quick-card">
            <div className="admin-profile-card-head">
              <span><FaShieldAlt /> Security Overview</span>
            </div>
            <div className="admin-profile-health-grid">
              <div className="health-metric">
                <span className="health-icon success"><FaCheck /></span>
                <div>
                  <span className="health-label">Profile Status</span>
                  <span className="health-value">Active</span>
                </div>
              </div>
              <div className="health-metric">
                <span className="health-icon warning"><FaLock /></span>
                <div>
                  <span className="health-label">Password Policy</span>
                  <span className="health-value">Minimum 6</span>
                </div>
              </div>
              <div className="health-metric">
                <span className="health-icon info"><FaUser /></span>
                <div>
                  <span className="health-label">Access Level</span>
                  <span className="health-value">{profile.role}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminProfileSettings;
