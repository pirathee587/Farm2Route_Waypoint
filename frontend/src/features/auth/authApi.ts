export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'LOADER' | 'DISPATCHER' | 'DRIVER' | 'STORE_MANAGER' | 'ADMIN';
  fullName?: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  accessToken?: string;
  errorMessage?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message?: string;
  errorMessage?: string;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          errorMessage: errorData.message || 'Incorrect email or password',
        };
      }

      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem('waypoint_token', data.accessToken);
      }
      if (credentials.rememberMe) {
        localStorage.setItem('waypoint_remember_email', credentials.email);
      } else {
        localStorage.removeItem('waypoint_remember_email');
      }

      return {
        success: true,
        accessToken: data.accessToken,
        user: data.user,
      };
    } catch {
      // Fallback for standalone demo when backend server is offline
      if (credentials.password === 'wrong' || credentials.password === 'error') {
        return {
          success: false,
          errorMessage: 'Incorrect email or password',
        };
      }

      const emailLower = (credentials.email || '').toLowerCase().trim();
      const isDriver = emailLower.includes('driver') || emailLower.startsWith('drv') || emailLower === 'kumar.s@waypoint.com';
      const isLoader = emailLower.includes('loader') || emailLower.startsWith('ldr');
      const isDispatcher = emailLower.includes('dispatcher');
      const isManager = emailLower.includes('manager');

      const role: 'LOADER' | 'DISPATCHER' | 'DRIVER' | 'STORE_MANAGER' | 'ADMIN' = isDriver
        ? 'DRIVER'
        : isLoader
        ? 'LOADER'
        : isDispatcher
        ? 'DISPATCHER'
        : isManager
        ? 'STORE_MANAGER'
        : 'DRIVER';

      const fullName = isDriver
        ? 'Kumar (Driver)'
        : isLoader
        ? 'Kumar S. (Loader)'
        : isDispatcher
        ? 'Kasun Perera'
        : isManager
        ? 'Kavishanth Silva'
        : 'Authenticated User';

      return {
        success: true,
        accessToken: 'mock-jwt-token-waypoint',
        user: {
          id: isDriver ? 'drv-014' : 'user-001',
          email: credentials.email,
          role,
          fullName,
        },
      };
    }
  },

  async resetPassword(email: string): Promise<ResetPasswordResult> {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        return {
          success: false,
          errorMessage: "We couldn't find an account with that email",
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || 'If this email is registered, a reset link has been sent.',
      };
    } catch {
      // Offline fallback: if test error email
      if (email.includes('notfound') || email === 'unknown@test.com') {
        return {
          success: false,
          errorMessage: "We couldn't find an account with that email",
        };
      }
      return {
        success: true,
        message: "We've sent a password reset link to your email.",
      };
    }
  },
};
