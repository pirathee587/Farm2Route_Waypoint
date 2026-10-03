import React, { useState } from 'react';
import { Eye, EyeOff, Radio, ShieldCheck, Check, ArrowLeft } from 'lucide-react';
import { WaypointMobileHexLogo } from '@/shared/components/Logos';
import { MobileTopMapBackground } from './AuthIllustration';
import { authApi } from './authApi';
import { AuthScreen } from './DesktopAuthView';

interface MobileAuthViewProps {
  screen: AuthScreen;
  setScreen: (screen: AuthScreen) => void;
  onLoginSuccess?: (email: string) => void;
}

export const MobileAuthView: React.FC<MobileAuthViewProps> = ({
  screen,
  setScreen,
  onLoginSuccess,
}) => {
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    const res = await authApi.login({ email, password });
    setIsSubmitting(false);

    if (res.success) {
      if (onLoginSuccess) onLoginSuccess(email);
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
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#1E293B',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        margin: '0 auto',
      }}
    >


      {/* TOP SECTION: Dark Map Background & WP Hexagon Monogram */}
      <div
        style={{
          position: 'relative',
          flex: '1',
          minHeight: '250px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 0 24px',
          overflow: 'hidden',
        }}
      >
        <MobileTopMapBackground />

        {/* Floating Brand Logo in Center */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <WaypointMobileHexLogo />
        </div>
      </div>

      {/* BOTTOM CARD — Flush with no corner gaps */}
      <div
        className="animate-slide-up"
        style={{
          position: 'relative',
          zIndex: 30,
          backgroundColor: '#FFFFFF',
          width: '100%',
          padding: '32px 24px 28px 24px',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >

        {/* SCREEN 1: MOBILE SIGN IN */}
        {screen === 'login' && (
          <>
            <div>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#111827',
                  letterSpacing: '-0.02em',
                  marginBottom: '6px',
                }}
              >
                Sign in
              </h1>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                Enter your work email and password to continue.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Email Field */}
              <div>
                <label
                  htmlFor="mobile-email"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1F2937',
                    marginBottom: '6px',
                  }}
                >
                  Email
                </label>
                <input
                  id="mobile-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter work email"
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 16px',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="mobile-password"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1F2937',
                    marginBottom: '6px',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="mobile-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '0 44px 0 16px',
                      borderRadius: '12px',
                      border: loginError ? '1.5px solid #EF4444' : '1px solid #E5E7EB',
                      fontSize: '14px',
                      color: '#111827',
                      backgroundColor: loginError ? '#FEF2F2' : '#FFFFFF',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {loginError && (
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>•</span>
                    {loginError}
                  </div>
                )}
              </div>

              {/* Forgot password link - Amber / Gold color */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setScreen('forgot-password');
                    setResetEmail(email);
                  }}
                  style={{
                    color: '#D97706',
                    fontSize: '13px',
                    fontWeight: 600,
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
                  height: '50px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                  marginTop: '4px',
                  opacity: isSubmitting ? 0.75 : 1,
                }}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>

              {/* Demo Loader quick-fill */}
              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('kumar.s@waypoint.com');
                    setPassword('loader123');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    border: '1px solid #FDE68A',
                  }}
                >
                  ⚡ Quick Fill: kumar.s@waypoint.com
                </button>
              </div>

              {/* Need access? Contact your administrator */}
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#6B7280',
                  marginTop: '4px',
                }}
              >
                Need access?{' '}
                <a href="mailto:admin@waypoint.lk" style={{ color: '#4B5563', textDecoration: 'underline' }}>
                  Contact your administrator.
                </a>
              </div>

              {/* Works Offline Info Pill (Screenshot 5) */}
              <div
                style={{
                  backgroundColor: '#F4F4F5',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginTop: '6px',
                }}
              >
                <div style={{ color: '#D97706', marginTop: '2px', flexShrink: 0 }}>
                  <Radio size={18} strokeWidth={2.2} />
                </div>
                <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.4' }}>
                  <strong>Works offline</strong> — sign in without a connection, it will sync once you&apos;re online.
                </div>
              </div>

              {/* Safety disclaimer: Interact only when safely stopped */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#6B7280',
                  marginTop: '4px',
                  paddingBottom: '4px',
                }}
              >
                <ShieldCheck size={16} strokeWidth={1.8} />
                <span>Interact only when safely stopped.</span>
              </div>
            </form>
          </>
        )}

        {/* SCREEN 2: MOBILE FORGOT PASSWORD */}
        {screen === 'forgot-password' && (
          <>
            <button
              type="button"
              onClick={() => {
                setScreen('login');
                setResetError(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#4B5563',
                fontSize: '13px',
                fontWeight: 500,
                alignSelf: 'flex-start',
              }}
            >
              <ArrowLeft size={16} />
              Back to login
            </button>

            <div>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: '6px',
                }}
              >
                Forgot your password?
              </h1>
              <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.45' }}>
                Enter the email linked to your account and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="mobile-reset-email"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1F2937',
                    marginBottom: '6px',
                  }}
                >
                  Email
                </label>
                <input
                  id="mobile-reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 16px',
                    borderRadius: '12px',
                    border: resetError ? '1.5px solid #EF4444' : '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                  }}
                />
                {resetError && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#EF4444', fontWeight: 500 }}>
                    {resetError}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  height: '50px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  marginTop: '4px',
                }}
              >
                {isSubmitting ? 'Sending link...' : 'Send reset link'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>
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
          </>
        )}

        {/* SCREEN 3: MOBILE CHECK YOUR EMAIL */}
        {screen === 'check-email' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', padding: '8px 0' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#111827',
                marginBottom: '4px',
              }}
            >
              <Check size={26} strokeWidth={3} />
            </div>

            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>
              Check your email
            </h1>
            <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.45' }}>
              We&apos;ve sent a password reset link to{' '}
              <strong style={{ color: '#111827' }}>{resetEmail || 'your email'}</strong>.
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
                marginTop: '4px',
                marginBottom: '8px',
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
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
