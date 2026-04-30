import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';
import ProfileModal from './ProfileModal';
import './Header.css';

const Header = ({ user, isDarkMode, toggleTheme, currentLanguage, changeLanguage, logout, t }) => {
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleProfileSave = (updatedUser) => {
    // Update is handled by parent component through context
    window.location.reload(); // Simple reload to refresh user data
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <h1 className="header-logo">XFus Chat</h1>
        </div>

        <div className="header-right">
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDarkMode ? t('lightTheme') : t('darkTheme')}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          <select
            className="language-select"
            value={currentLanguage}
            onChange={(e) => changeLanguage(e.target.value)}
          >
            <option value="en">EN</option>
            <option value="ru">RU</option>
          </select>

          <div 
            className="user-info" 
            onClick={() => setShowProfileModal(true)}
            style={{ cursor: 'pointer' }}
            title={t('profile')}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">
                {user?.displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <span className="user-name">{user?.displayName || user?.username}</span>
          </div>

          <button className="logout-btn" onClick={logout}>
            {t('logout')}
          </button>
        </div>
      </header>

      {showProfileModal && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onSave={handleProfileSave}
        />
      )}
    </>
  );
};

export default Header;
