/**
 * AuthContext — provides isLoggedIn, user, token, login(), loginWithToken(),
 * logout(), markTourComplete() to all pages.
 *
 * isLoading is true during the initial token restore check. ProtectedRoute must
 * wait for isLoading=false before deciding to redirect, otherwise it flashes to
 * /login on every page refresh even when the user IS logged in.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMe, markTourComplete as apiMarkTourComplete } from '../services/authService';
import type { User } from '../types/auth';

interface AuthContextValue {
  isLoggedIn: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
  markTourComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: check localStorage for a saved token and validate it
  useEffect(() => {
    const saved = localStorage.getItem('token');
    if (!saved) {
      setIsLoading(false);
      return;
    }
    getMe(saved)
      .then((u) => {
        setToken(saved);
        setUser(u);
      })
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (newToken: string): Promise<void> => {
    localStorage.setItem('token', newToken);
    const u = await getMe(newToken);
    setToken(newToken);
    setUser(u);
  }, []);

  // Same as login — alias used by AuthCallbackPage for clarity
  const loginWithToken = login;

  const logout = useCallback((): void => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const markTourComplete = useCallback(async (): Promise<void> => {
    if (!token) return;
    await apiMarkTourComplete(token);
    setUser((prev) => (prev ? { ...prev, has_seen_tour: true } : prev));
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!token,
        isLoading,
        isAdmin: !!user?.is_admin,
        user,
        token,
        login,
        loginWithToken,
        logout,
        markTourComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook — throws if used outside <AuthProvider> */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
