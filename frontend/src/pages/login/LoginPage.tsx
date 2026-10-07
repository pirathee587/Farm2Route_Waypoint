import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, LogOut } from 'lucide-react';
import { DesktopAuthView, AuthScreen } from '@/features/auth/DesktopAuthView';
import { MobileAuthView } from '@/features/auth/MobileAuthView';
import type { AuthUser } from '@/features/auth/authApi';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [loggedInUser, setLoggedInUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoginSuccess = (user: AuthUser) => {
    if (user?.role === 'STORE_MANAGER') {
      navigate('/store-manager');
      return;
    }
    if (user.role === 'DRIVER') {
      window.location.assign('/driver');
      return;
    }
    if (user.role === 'LOADER') {
      window.location.assign('/loader');
      return;
    }
    if (user.role === 'DISPATCHER' || user.role === 'ADMIN') {
      window.location.assign('/dispatcher/dashboard');
      return;
    }
    setLoggedInUser({ email: user.email, role: user.role });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        margin: '0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Logged in success banner */}
      {loggedInUser && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            zIndex: 90,
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '14px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>Signed in as {loggedInUser.email} ({loggedInUser.role.replace('_', ' ')} Account)</span>
          <button
            type="button"
            onClick={() => setLoggedInUser(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              marginLeft: '8px',
            }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      )}

      {/* Automatic Responsive View */}
      {isMobile ? (
        <div style={{ width: '100%', minHeight: '100vh' }}>
          <MobileAuthView
            screen={screen}
            setScreen={setScreen}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      ) : (
        <DesktopAuthView
          screen={screen}
          setScreen={setScreen}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
};
