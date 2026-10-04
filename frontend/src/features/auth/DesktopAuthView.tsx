import React, { useState } from 'react';
import { Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';
import { WaypointDesktopLogo } from '@/shared/components/Logos';
import { DesktopRightPanel } from './AuthIllustration';
import { authApi, LoginCredentials, AuthUser } from './authApi';

export type AuthScreen = 'login' | 'forgot-password' | 'check-email';

interface DesktopAuthViewProps {
  screen: AuthScreen;
  setScreen: (screen: AuthScreen) => void;
  onLoginSuccess?: (user: AuthUser) => void;
}

export const DesktopAuthView: React.FC<DesktopAuthViewProps> = ({
  screen,
  setScreen,
  onLoginSuccess,
}) => {
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    const res = await authApi.login({ email, password, rememberMe });
    setIsSubmitting(false);

    if (res.success) {
      if (onLoginSuccess && res.user) onLoginSuccess(res.user);
    } else {
      setLoginError(res.errorMessage || 'Incorrect email or password');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setIsSubmitting(true);

    const res = await authApi.resetPassword(resetEmail);
    setIsSubmitting(false);

    if (res.success) {
      setScreen('check-email');
      setResendTimer(30);
    } else {
      setResetError(res.errorMessage || "We couldn't find an account with that email");
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 46%) minmax(460px, 54%)',
        overflow: 'hidden',
        margin: '0',
      }}
    >
      {/* Top Left Floating ERROR Pill if error exists (Screenshot 4) */}
      {loginError && screen === 'login' && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1E293B',
            color: '#F8FAFC',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '4px 10px',
            borderRadius: '16px',
            zIndex: 40,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          ERROR
        </div>
      )}

      {/* LEFT FORM PANE */}
      <div
        style={{
          padding: '40px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Top Header: Logo / Back Link */}
        <div>
          {screen === 'login' ? (
            <WaypointDesktopLogo />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <WaypointDesktopLogo />
              <button
                type="button"
                onClick={() => {
                  setScreen('login');
                  setResetError(null);
                  setLoginError(null);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#4B5563',
                  fontSize: '14px',
                  fontWeight: 500,
                  alignSelf: 'flex-start',
                }}
              >
                <ArrowLeft size={16} />
                Back to login
              </button>
            </div>
          )}

          {/* SCREEN 1: LOGIN FORM */}
          {screen === 'login' && (
            <div style={{ marginTop: '42px' }}>
              <h1
                style={{
                  fontSize: '34px',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '-0.025em',
                  marginBottom: '8px',
                }}
              >
                Welcome back
              </h1>
              <p
                style={{
                  fontSize: '15px',
                  color: '#64748B',
                  marginBottom: '32px',
                }}
              >
                Sign in to manage today&apos;s loading queue.
              </p>

              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="desktop-email"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1E293B',
                      marginBottom: '6px',
                    }}
                  >
                    Email
                  </label>
                  <input
                    id="desktop-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="desktop-password"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1E293B',
                      marginBottom: '6px',
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="desktop-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      style={{
                        width: '100%',
                        height: '46px',
                        padding: '0 40px 0 14px',
                        borderRadius: '10px',
                        border: loginError ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        fontSize: '14px',
                        color: '#0F172A',
                        backgroundColor: loginError ? '#FEF2F2' : '#FFFFFF',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Red error bullet under password (Screenshot 4) */}
                  {loginError && (
                    <div
                      style={{
                        marginTop: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>•</span>
                      {loginError}
                    </div>
                  )}
                </div>

                {/* Remember me & Forgot password Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    marginTop: '-4px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      color: '#475569',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        accentColor: '#0F172A',
                        cursor: 'pointer',
                      }}
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setScreen('forgot-password');
                      setResetEmail(email);
                    }}
                    style={{
                      fontWeight: 600,
                      color: '#2563EB',
                      borderBottom: '2px solid #F59E0B',
                      paddingBottom: '1px',
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign in Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    height: '48px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                    marginTop: '4px',
                    opacity: isSubmitting ? 0.75 : 1,
                  }}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>

                {/* "or" Divider */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    margin: '6px 0',
                  }}
                >
                  <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', backgroundColor: '#E2E8F0' }} />
                  <span
                    style={{
                      position: 'relative',
                      backgroundColor: '#FFFFFF',
                      padding: '0 12px',
                      fontSize: '12px',
                      color: '#94A3B8',
                    }}
                  >
                    or
                  </span>
                </div>

                {/* Loader portal role disclaimer banner */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderLeft: '4px solid #EAB308',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    fontSize: '12px',
                    lineHeight: '1.45',
                    color: '#475569',
                  }}
                >
                  This portal is for Loader accounts. Dispatcher/Driver/Store Manager use their own login link.
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 2: FORGOT PASSWORD */}
          {screen === 'forgot-password' && (
            <div style={{ marginTop: '24px' }}>
              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '-0.025em',
                  marginBottom: '8px',
                }}
              >
                Forgot your password?
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: '#64748B',
                  lineHeight: '1.5',
                  marginBottom: '28px',
                }}
              >
                Enter the email linked to your account and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label
                    htmlFor="desktop-reset-email"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1E293B',
                      marginBottom: '6px',
                    }}
                  >
                    Email
                  </label>
                  <input
                    id="desktop-reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: resetError ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '14px',
                      color: '#0F172A',
                    }}
                  />
                  {resetError && (
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#EF4444', fontWeight: 500 }}>
                      {resetError}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    height: '48px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '8px',
                  }}
                >
                  {isSubmitting ? 'Sending link...' : 'Send reset link'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#64748B' }}>
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => setScreen('login')}
                    style={{ color: '#0F172A', fontWeight: 600 }}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 3: CHECK YOUR EMAIL */}
          {screen === 'check-email' && (
            <div style={{ marginTop: '36px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#111827',
                  marginBottom: '24px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                }}
              >
                <Check size={28} strokeWidth={3} />
              </div>

              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '-0.025em',
                  marginBottom: '8px',
                }}
              >
                Check your email
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: '#64748B',
                  lineHeight: '1.5',
                  marginBottom: '20px',
                }}
              >
                We&apos;ve sent a password reset link to{' '}
                <strong style={{ color: '#1E293B' }}>{resetEmail || 'user@email.com'}</strong>. Didn&apos;t get it?
              </p>

              <button
                type="button"
                onClick={() => {
                  if (resendTimer === 0) setResendTimer(30);
                }}
                disabled={resendTimer > 0}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: resendTimer > 0 ? '#94A3B8' : '#2563EB',
                  display: 'block',
                  marginBottom: '32px',
                }}
              >
                Resend link {resendTimer > 0 ? `(${resendTimer}s)` : ''}
              </button>

              <button
                type="button"
                onClick={() => setScreen('login')}
                style={{
                  width: '100%',
                  height: '48px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Back to login
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM FOOTER */}
        <div
          style={{
            marginTop: '32px',
            fontSize: '13px',
            color: '#64748B',
            textAlign: 'center',
          }}
        >
          Don&apos;t have an account?{' '}
          <a
            href="mailto:dispatch@waypoint.lk"
            style={{ fontWeight: 600, color: '#0F172A' }}
          >
            Contact your dispatcher
          </a>
        </div>
      </div>

      {/* RIGHT ILLUSTRATION PANE */}
      <div style={{ padding: 0, margin: 0, height: '100vh', width: '100%', overflow: 'hidden' }}>
        <DesktopRightPanel />
      </div>
    </div>
  );
};
