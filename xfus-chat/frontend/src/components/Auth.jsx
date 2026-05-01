import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Auth.css';

const Auth = ({ onAuthSuccess }) => {
  const { t, i18n } = useTranslation();
  const { login, register } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLoginMode) {
        if (!formData.username || !formData.password) {
          throw new Error(t('allFieldsRequired'));
        }
        await login(formData.username, formData.password);
        onAuthSuccess();
      } else {
        // Registration validation
        if (!formData.username || !formData.email || !formData.phone || 
            !formData.password || !formData.displayName) {
          throw new Error(t('allFieldsRequired'));
        }

        if (formData.password.length < 6) {
          throw new Error(t('passwordTooShort'));
        }

        if (formData.password !== formData.confirmPassword) {
          throw new Error(t('passwordMismatch'));
        }

        await register({
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          displayName: formData.displayName
        });
        onAuthSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-controls">
        <button 
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={isDarkMode ? t('lightTheme') : t('darkTheme')}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        
        <select
          className="language-select-auth"
          value={i18n.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          <option value="en">EN</option>
          <option value="ru">RU</option>
        </select>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">XFus Chat</h1>
          <p className="auth-subtitle">{isLoginMode ? t('signIn') : t('signUp')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLoginMode && (
            <>
              <div className="form-group">
                <label htmlFor="displayName">{t('displayName')}</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder={t('displayName')}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="username">{t('username')}</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder={t('username')}
                  required
                  minLength={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">{t('email')}</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('email')}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">{t('phone')}</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('phone')}
                  required
                />
              </div>
            </>
          )}

          {isLoginMode && (
            <>
              <div className="form-group">
                <label htmlFor="loginUsername">{t('username')} / {t('email')} / {t('phone')}</label>
                <input
                  type="text"
                  id="loginUsername"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder={`${t('username')} / ${t('email')} / ${t('phone')}`}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="password">{t('password')}</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('password')}
                required
                minLength={6}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="confirmPassword">{t('confirmPassword')}</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('confirmPassword')}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '...' : (isLoginMode ? t('signIn') : t('signUp'))}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {isLoginMode ? t('noAccount') : t('haveAccount')}{' '}
            <button
              type="button"
              className="switch-btn"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError('');
                setFormData({
                  username: '',
                  email: '',
                  phone: '',
                  password: '',
                  confirmPassword: '',
                  displayName: ''
                });
              }}
            >
              {isLoginMode ? t('signUp') : t('signIn')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
