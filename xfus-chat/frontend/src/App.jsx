import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Chat from './components/Chat';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Chat />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
