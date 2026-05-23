export type AuthRole = 'admin' | 'user';

export interface TokenPayload {
  id?: number;
  username?: string;
  role?: AuthRole;
  exp?: number;
  [key: string]: unknown;
}

export const PROFILE_USERNAME_KEY = 'profile_username';

export function parseTokenPayload(token?: string | null): TokenPayload | null {
  try {
    if (!token || token === 'null' || token === 'undefined') return null;
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );

    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

export function isTokenExpired(payload?: TokenPayload | null): boolean {
  return typeof payload?.exp === 'number' && payload.exp * 1000 <= Date.now();
}

export function clearStoredAuth(): void {
  localStorage.removeItem('token');
  localStorage.removeItem(PROFILE_USERNAME_KEY);
}
