import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { THEMES } from './context/themes';
import { useAuthStore } from './store/useAuthStore';

function Root() {
  const { user } = useAuthStore();

  return (
    <ThemeProvider themes={THEMES} userRole={user?.role}>
      <App />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
