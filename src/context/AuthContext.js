import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import { getAuthSession } from '../storage/tokenStorage';

export const AuthContext = createContext(undefined);

function getDisplayError(error) {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return 'Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedSession = await getAuthSession();

        if (isMounted) {
          setSession(storedSession);
        }
      } catch {
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (phoneNumber, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const authenticatedSession = await authService.login({ phoneNumber, password });
      setSession(authenticatedSession);
      return authenticatedSession;
    } catch (loginError) {
      setError(getDisplayError(loginError));
      throw loginError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const accessToken = session?.accessToken ?? null;
  const role = session?.role ?? null;
  const isAuthenticated = Boolean(accessToken);

  const contextValue = useMemo(
    () => ({
      session,
      accessToken,
      role,
      isAuthenticated,
      isInitializing,
      isLoading,
      error,
      login,
      logout,
      clearError,
    }),
    [
      session,
      accessToken,
      role,
      isAuthenticated,
      isInitializing,
      isLoading,
      error,
      login,
      logout,
      clearError,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
