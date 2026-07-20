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

  const [user, setUser] = useState(getStoredUser);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const saveAccessToken = useCallback((token) => {
    if (!token) {
      throw new Error("Access token bulunamadı.");
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    setAccessToken(token);
  }, []);

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
    localStorage.removeItem(AUTH_USER_KEY);

    setAccessToken(null);
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

      if (!authResponse?.role || !authResponse?.userId) {
        throw new Error("Backend kullanıcı rolü veya kullanıcı ID'si döndürmedi.");
      }

      saveAccessToken(authResponse.accessToken);

      const authUser = saveUser({
        userId: authResponse.userId,
        role: authResponse.role,
      });

      return {
        accessToken: authResponse.accessToken,
        tokenType: authResponse.tokenType ?? "Bearer",
        user: authUser,
      };
    },
    [saveAccessToken, saveUser]
  );

  const renewAccessToken = useCallback(async () => {
    try {
      const authResponse = await refreshTokenRequest();

      if (!authResponse?.accessToken) {
        throw new Error("Yeni access token alınamadı.");
      }

      /*
       * Refresh endpoint'i yalnızca accessToken döndürüyor.
       * Bu yüzden mevcut role ve userId bilgilerini değiştirmiyoruz.
       */
      saveAccessToken(authResponse.accessToken);

      return authResponse.accessToken;
    } catch (error) {
      clearSession();
      throw error;
    }
  }, [clearSession, saveAccessToken]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedUser = getStoredUser();

      /*
       * Hem token hem kullanıcı bilgisi varsa mevcut oturumu kullan.
       */
      if (storedAccessToken && storedUser) {
        setAccessToken(storedAccessToken);
        setUser(storedUser);
        setIsAuthLoading(false);
        return;
      }

      /*
       * Access token yoksa HttpOnly refresh cookie üzerinden
       * yeni token almaya çalış.
       *
       * Ancak refresh cevabında role ve userId bulunmadığı için
       * önceden saklanmış authUser bilgisinin mevcut olması gerekir.
       */
      if (storedUser) {
        try {
          const authResponse = await refreshTokenRequest();

          if (!authResponse?.accessToken) {
            throw new Error("Access token yenilenemedi.");
          }

          saveAccessToken(authResponse.accessToken);
          setUser(storedUser);
        } catch {
          clearSession();
        }
      } else {
        clearSession();
      }

      setIsAuthLoading(false);
    };

    initializeAuth();
  }, [clearSession, saveAccessToken]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      userId: user?.userId ?? null,
      accessToken,
      isAuthenticated: Boolean(accessToken && user),
      isAuthLoading,
      login,
      logout,
      renewAccessToken,
    }),
    [
      user,
      accessToken,
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