import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import './Header.css';

const Header = ({ user, isDarkMode, toggleTheme, currentLanguage, changeLanguage, logout, t }) => {
  return (
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

        <div className="user-info">
          <span className="user-name">{user?.displayName || user?.username}</span>
        </div>

        <button className="logout-btn" onClick={logout}>
          {t('logout')}
        </button>
      </div>
    </header>
  );
};

export default Header;
