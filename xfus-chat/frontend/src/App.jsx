import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Auth from './components/Auth';
import Chat from './components/Chat';
import './i18n/index.js';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(!isAuthenticated);

  useEffect(() => {
    setShowAuth(!isAuthenticated);
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return showAuth ? (
    <Auth onAuthSuccess={() => setShowAuth(false)} />
  ) : (
    <Chat />
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
