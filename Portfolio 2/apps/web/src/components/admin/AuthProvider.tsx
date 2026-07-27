'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';
import type { PageMeta, Role } from '@/lib/types';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  lastLoginAt: string | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  /** Authenticated request helper. Refreshes the access token once on 401. */
  request: <T>(path: string, init?: AdminRequestInit) => Promise<{ data: T; meta?: PageMeta }>;
  can: (minimum: Role) => boolean;
  refreshUser: () => Promise<void>;
}

export interface AdminRequestInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Raw FormData passes through untouched so uploads keep their boundary. */
  formData?: FormData;
}

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };

/** Access token lives in memory only — never in localStorage, never readable by XSS-injected scripts. */
const AuthContext = createContext<AuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const tokenRef = useRef<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const scheduleRefresh = useCallback((expiresIn: string) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);

    // "15m" → refresh two minutes early; fall back to 10 minutes.
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match?.[2] ?? 'm'] ?? 60;
    const seconds = match ? Number(match[1]) * unit : 900;
    const delay = Math.max((seconds - 120) * 1000, 30_000);

    refreshTimer.current = setTimeout(() => {
      void refresh();
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('refresh failed');

      const payload = (await response.json()) as {
        data: { accessToken: string; expiresIn: string; user: SessionUser };
      };

      tokenRef.current = payload.data.accessToken;
      setUser(payload.data.user);
      setStatus('authenticated');
      scheduleRefresh(payload.data.expiresIn);
      return true;
    } catch {
      tokenRef.current = null;
      setUser(null);
      setStatus('anonymous');
      return false;
    }
  }, [scheduleRefresh]);

  // Silent sign-in on mount using the http-only refresh cookie.
  useEffect(() => {
    void refresh();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refresh]);

  const request = useCallback(
    async <T,>(path: string, init: AdminRequestInit = {}): Promise<{ data: T; meta?: PageMeta }> => {
      const send = async (): Promise<Response> => {
        const { body, formData, headers, ...rest } = init;
        return fetch(`${API_URL}${path}`, {
          ...rest,
          credentials: 'include',
          headers: {
            ...(formData ? {} : { 'Content-Type': 'application/json' }),
            ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
            ...headers,
          },
          ...(formData ? { body: formData } : body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
      };

      let response = await send();

      // One transparent retry after refreshing an expired access token.
      if (response.status === 401 && (await refresh())) {
        response = await send();
      }

      if (response.status === 204) return { data: undefined as T };

      const payload = (await response.json().catch(() => null)) as
        | { success: boolean; data: T; meta?: PageMeta; error?: { message: string; details?: unknown } }
        | null;

      if (!response.ok || !payload?.success) {
        const error = new Error(payload?.error?.message ?? `Request failed (${response.status})`);
        (error as Error & { details?: unknown }).details = payload?.error?.details;
        throw error;
      }

      return { data: payload.data, meta: payload.meta };
    },
    [refresh],
  );

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        data?: { accessToken: string; expiresIn: string; user: SessionUser };
        error?: { message: string };
      } | null;

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error?.message ?? 'Sign-in failed');
      }

      tokenRef.current = payload.data.accessToken;
      setUser(payload.data.user);
      setStatus('authenticated');
      scheduleRefresh(payload.data.expiresIn);
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(
      () => undefined,
    );
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    tokenRef.current = null;
    setUser(null);
    setStatus('anonymous');
    router.push('/admin/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    const { data } = await request<SessionUser>('/api/auth/me');
    setUser(data);
  }, [request]);

  const can = useCallback((minimum: Role) => (user ? RANK[user.role] >= RANK[minimum] : false), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, request, can, refreshUser }),
    [user, status, login, logout, request, can, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}
