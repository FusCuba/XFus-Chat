import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Chat from './components/Chat';
import Auth from './components/Auth';
import './i18n';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      setIsAuthReady(true);
    }
  }, [loading]);

  if (!isAuthReady) {
    return null; // Show nothing while checking auth status
  }

  return isAuthenticated ? <Chat /> : <Auth onAuthSuccess={() => {}} />;
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
