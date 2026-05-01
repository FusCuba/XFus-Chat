import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ProfileModal.css';

const ProfileModal = ({ user, onClose, onSave }) => {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ displayName, avatar })
      });

      if (response.ok) {
        const data = await response.json();
        onSave(data.user);
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>{t('editProfile')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-avatar-section">
            <div className="avatar-preview">
              {avatar ? (
                <img src={avatar} alt="Avatar" />
              ) : (
                <div className="avatar-placeholder">
                  {displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="avatar">{t('avatarUrl')}</label>
              <input
                type="url"
                id="avatar"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="displayName">{t('displayName')}</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={50}
            />
          </div>

          <div className="profile-info-readonly">
            <div className="info-row">
              <span className="info-label">{t('username')}:</span>
              <span className="info-value">{user?.username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('email')}:</span>
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('phone')}:</span>
              <span className="info-value">{user?.phone}</span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="profile-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? '...' : t('saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
