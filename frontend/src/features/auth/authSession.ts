import type { AuthUser } from './authApi';

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

const SESSION_KEY = 'waypoint_auth_session';

export const authSession = {
  get(): AuthSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
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