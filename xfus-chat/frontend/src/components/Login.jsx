import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Login = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: ''
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
      if (!formData.username || !formData.password) {
        throw new Error(t('allFieldsRequired'));
      }
      await login(formData.username, formData.password);
      navigate('/chat');
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
          <p className="auth-subtitle">{t('signIn')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '...' : t('signIn')}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {t('noAccount')}{' '}
            <Link to="/register" className="switch-btn">
              {t('signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
