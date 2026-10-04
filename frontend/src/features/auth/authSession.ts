import type { AuthUser } from './authApi';

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

const SESSION_KEY = 'waypoint_auth_session';

export const MOCK_STORE_MANAGER_SESSION: AuthSession = {
  accessToken: 'mock-jwt-store-manager',
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'store.manager@waypoint.com',
    role: 'STORE_MANAGER',
    fullName: 'Store Manager',
  },
};

export const authSession = {
  get(): AuthSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return MOCK_STORE_MANAGER_SESSION;

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return MOCK_STORE_MANAGER_SESSION;
    }
  },

  set(session: AuthSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  clear(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  isStoreManager(): boolean {
    return this.get()?.user.role === 'STORE_MANAGER';
  },
};