import React, { useState, useEffect } from 'react';
import { LoginPage } from '@/pages/login/LoginPage';
import { LoadingPortalPage } from '@/pages/loading/LoadingPortalPage';
import { DriverPortalPage } from '@/pages/delivery/DriverPortalPage';
import { AuthUser } from '@/features/auth/authApi';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('waypoint_user_session');
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [portalMode, setPortalMode] = useState<'driver' | 'loading' | 'login'>(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('waypoint_user_session');
      let user: AuthUser | null = null;
      if (storedUser) {
        try {
          user = JSON.parse(storedUser);
        } catch {
          user = null;
        }
      }

      // If user is not logged in, ALWAYS start at 'login'
      if (!user) {
        return 'login';
      }

      const hash = window.location.hash;
      if (hash === '#driver' || hash === '#delivery') return 'driver';
      if (hash === '#loading' || hash === '#portal') return 'loading';
      if (hash === '#login') return 'login';

      return user.role === 'LOADER' ? 'loading' : 'driver';
    }
    return 'login';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const storedUser = localStorage.getItem('waypoint_user_session');
      let user: AuthUser | null = currentUser;
      if (!user && storedUser) {
        try {
          user = JSON.parse(storedUser);
        } catch {
          user = null;
        }
      }

      // Protect portals: unauthenticated users cannot access portals directly
      if (!user) {
        if (hash !== '#login') {
          window.location.hash = '#login';
        }
        setPortalMode('login');
        return;
      }

      if (hash === '#login') {
        setPortalMode('login');
      } else if (hash === '#loading' || hash === '#portal') {
        setPortalMode('loading');
      } else if (hash === '#driver' || hash === '#delivery') {
        setPortalMode('driver');
      }
    };

    // Ensure initial unauthenticated route defaults to #login
    if (!currentUser && window.location.hash !== '#login') {
      window.location.hash = '#login';
      setPortalMode('login');
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('waypoint_user_session', JSON.stringify(user));
    if (user.role === 'LOADER') {
      setPortalMode('loading');
      window.location.hash = '#loading';
    } else {
      // Driver or other roles navigate to Driver Portal
      setPortalMode('driver');
      window.location.hash = '#driver';
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('waypoint_user_session');
    setPortalMode('login');
    window.location.hash = '#login';
  };

  return (
    <div>
      {/* Top Quick Role / Portal Switcher */}
      <aside
        aria-label="Portal switcher"
        style={{
          position: 'fixed',
          top: 12,
          left: 16,
          zIndex: 9999,
          display: 'none',
          gap: 6,
          alignItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          padding: '6px 12px',
          borderRadius: 14,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginRight: 4,
          }}
        >
          WayPoint:
        </span>

        {currentUser ? (
          <>
            <button
              type="button"
              onClick={() => {
                setPortalMode('driver');
                window.location.hash = '#driver';
              }}
              style={{
                fontSize: 11,
                fontWeight: 800,
                backgroundColor: portalMode === 'driver' ? '#facc15' : 'transparent',
                color: portalMode === 'driver' ? '#0f172a' : '#cbd5e1',
                padding: '4px 8px',
                borderRadius: 8,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              🚚 Driver Portal
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalMode('loading');
                window.location.hash = '#loading';
              }}
              style={{
                fontSize: 11,
                fontWeight: 800,
                backgroundColor: portalMode === 'loading' ? '#facc15' : 'transparent',
                color: portalMode === 'loading' ? '#0f172a' : '#cbd5e1',
                padding: '4px 8px',
                borderRadius: 8,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              📦 Loading Portal
            </button>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                padding: '3px 8px',
                borderRadius: 6,
                marginLeft: 4,
              }}
            >
              {currentUser.role}: {currentUser.fullName || currentUser.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: 8,
                cursor: 'pointer',
                border: 'none',
                marginLeft: 4,
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#facc15',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            🔐 Sign In with Driver credentials to access Driver Portal
          </span>
        )}
      </aside>

      {/* Portal Views */}
      {portalMode === 'driver' && currentUser && (
        <DriverPortalPage onLogout={handleLogout} currentUser={currentUser} />
      )}
      {portalMode === 'loading' && currentUser && (
        <LoadingPortalPage onLogout={handleLogout} />
      )}
      {portalMode === 'login' && (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
