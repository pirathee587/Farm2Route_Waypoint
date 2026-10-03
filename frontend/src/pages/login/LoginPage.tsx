import React, { useState, useEffect } from 'react';
import { DesktopAuthView, AuthScreen } from '@/features/auth/DesktopAuthView';
import { MobileAuthView } from '@/features/auth/MobileAuthView';

interface LoginPageProps {
  onLoginSuccess?: (email: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoginSuccess = (email: string) => {
    if (onLoginSuccess) {
      onLoginSuccess(email);
    }
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
      {/* Automatic Responsive View: Mobile/Tablet vs Desktop */}
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

export default LoginPage;
