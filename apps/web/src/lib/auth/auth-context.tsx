'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  tier: 'FREE' | 'PRO' | 'TEAM';
  githubId: string;
  privacyMode: boolean;
  ghostMode: boolean;
  customStatus: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  signInWithSSO: () => void;
  ssoEnabled: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        return;
      }

      const response = await fetch(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else if (response.status === 401) {
        localStorage.removeItem('auth_token');
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Handle token from SSO redirect (e.g. /dashboard?token=xxx)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('auth_token', token);
      window.history.replaceState({}, '', window.location.pathname);
    }
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    fetch(`${API_URL}/auth/sso/status`)
      .then((res) => res.json())
      .then((data: { enabled: boolean }) => setSsoEnabled(data.enabled))
      .catch(() => setSsoEnabled(false));
  }, []);

  const signIn = () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = `${API_URL}/auth/github?redirect_uri=${window.location.origin}/dashboard`;
    }
  };

  const signInWithSSO = () => {
    window.location.href = `${API_URL}/auth/sso`;
  };

  const signOut = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        signInWithSSO,
        ssoEnabled,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
