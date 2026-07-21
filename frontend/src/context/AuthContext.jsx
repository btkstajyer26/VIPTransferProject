import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  login as loginRequest,
  logout as logoutRequest,
  refreshToken as refreshTokenRequest,
} from "@/api/authApi";

export const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_USER_KEY = "authUser";

function getStoredUser() {
  const storedUser = localStorage.getItem(AUTH_USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem(ACCESS_TOKEN_KEY)
  );

  const [refreshToken, setRefreshToken] = useState(() =>
    localStorage.getItem(REFRESH_TOKEN_KEY)
  );

  const [user, setUser] = useState(getStoredUser);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const saveTokens = useCallback(
    ({ accessToken: newAccessToken, refreshToken: newRefreshToken }) => {
      if (!newAccessToken) {
        throw new Error("Access token bulunamadı.");
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
      setAccessToken(newAccessToken);

      if (newRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        setRefreshToken(newRefreshToken);
      }
    },
    []
  );

  const saveUser = useCallback((userData) => {
    const authUser = {
      userId: userData.userId,
      role: userData.role,
    };

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
    setUser(authUser);

    return authUser;
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const login = useCallback(
    async ({ phoneNumber, password }) => {
      const authResponse = await loginRequest({
        phoneNumber,
        password,
      });

      if (!authResponse?.accessToken) {
        throw new Error("Backend access token döndürmedi.");
      }

      if (!authResponse?.refreshToken) {
        throw new Error("Backend refresh token döndürmedi.");
      }

      if (!authResponse?.role || authResponse?.userId == null) {
        throw new Error(
          "Backend kullanıcı rolü veya kullanıcı ID'si döndürmedi."
        );
      }

      saveTokens({
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
      });

      const authUser = saveUser({
        userId: authResponse.userId,
        role: authResponse.role,
      });

      return {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        tokenType: authResponse.tokenType ?? "Bearer",
        user: authUser,
      };
    },
    [saveTokens, saveUser]
  );

  const renewAccessToken = useCallback(async () => {
    const storedRefreshToken =
      refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!storedRefreshToken) {
      clearSession();
      throw new Error("Refresh token bulunamadı.");
    }

    try {
      const authResponse = await refreshTokenRequest(storedRefreshToken);

      if (!authResponse?.accessToken) {
        throw new Error("Yeni access token alınamadı.");
      }

      saveTokens({
        accessToken: authResponse.accessToken,
        refreshToken:
          authResponse.refreshToken || storedRefreshToken,
      });

      return authResponse.accessToken;
    } catch (error) {
      clearSession();
      throw error;
    }
  }, [refreshToken, clearSession, saveTokens]);

  const logout = useCallback(async () => {
    const storedRefreshToken =
      refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);

    try {
      if (storedRefreshToken) {
        await logoutRequest(storedRefreshToken);
      }
    } finally {
      clearSession();
    }
  }, [refreshToken, clearSession]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedAccessToken =
          localStorage.getItem(ACCESS_TOKEN_KEY);

        const storedRefreshToken =
          localStorage.getItem(REFRESH_TOKEN_KEY);

        const storedUser = getStoredUser();

        if (storedAccessToken && storedRefreshToken && storedUser) {
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
          setUser(storedUser);
          return;
        }

        if (storedRefreshToken && storedUser) {
          const authResponse =
            await refreshTokenRequest(storedRefreshToken);

          if (!authResponse?.accessToken) {
            throw new Error("Access token yenilenemedi.");
          }

          saveTokens({
            accessToken: authResponse.accessToken,
            refreshToken:
              authResponse.refreshToken || storedRefreshToken,
          });

          setUser(storedUser);
          return;
        }

        clearSession();
      } catch {
        clearSession();
      } finally {
        setIsAuthLoading(false);
      }
    };

    initializeAuth();
  }, [clearSession, saveTokens]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      userId: user?.userId ?? null,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(
        accessToken && refreshToken && user
      ),
      isAuthLoading,
      login,
      logout,
      renewAccessToken,
    }),
    [
      user,
      accessToken,
      refreshToken,
      isAuthLoading,
      login,
      logout,
      renewAccessToken,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}