import React, { useState, useEffect } from 'react';
import { LoginPage } from '@/pages/login/LoginPage';
import { LoadingPortalPage } from '@/pages/loading/LoadingPortalPage';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ email: string; role?: string } | null>(() => {
    // 1. Check if user is already logged in
    const storedUser = localStorage.getItem('waypoint_loader_session');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }

    // 2. Allow hash override if explicitly requested (#portal or #loading)
    if (
      typeof window !== 'undefined' &&
      (window.location.hash === '#loading' || window.location.hash === '#portal')
    ) {
      return { email: 'kumar.s@waypoint.com', role: 'LOADER' };
    }

    // Default to login page initially so loader can sign in!
    return null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#login') {
        setCurrentUser(null);
        localStorage.removeItem('waypoint_loader_session');
      } else if (
        window.location.hash === '#loading' ||
        window.location.hash === '#portal'
      ) {
        const user = { email: 'kumar.s@waypoint.com', role: 'LOADER' };
        setCurrentUser(user);
        localStorage.setItem('waypoint_loader_session', JSON.stringify(user));
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLoginSuccess = (email: string) => {
    const user = { email, role: 'LOADER' };
    setCurrentUser(user);
    localStorage.setItem('waypoint_loader_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('waypoint_loader_session');
    window.location.hash = '#login';
  };

  return (
    <div>
      {currentUser ? (
        <LoadingPortalPage onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
