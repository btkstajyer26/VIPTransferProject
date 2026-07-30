import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "/api";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_USER_KEY = "authUser";

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

function clearStoredSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

let refreshPromise = null;

/*
 * Token varsa isteğe eklenir.
 *
 * allowAnonymous true olsa bile kullanıcı giriş yaptıysa
 * token gönderilir. Böylece aynı endpoint hem misafir hem
 * giriş yapmış kullanıcı tarafından kullanılabilir.
 */
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const lang = localStorage.getItem('i18nextLng') || 'TR';

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    config.headers['Accept-Language'] = lang;

    return config;
  },

  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    /*
     * Bu istek misafir kullanıcıların da erişebildiği
     * bir endpoint mi?
     */
    const allowAnonymous =
      originalRequest.allowAnonymous === true;

    const requestUrl =
      originalRequest.url || "";

    /*
     * Login ve refresh isteklerinde yeniden refresh
     * denenmez.
     */
    if (
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    /*
     * Aynı istek daha önce refresh edilerek tekrar
     * gönderildiyse ikinci kez deneme.
     */
    if (originalRequest._retry) {
      clearStoredSession();

      /*
       * Public isteklerde login sayfasına yönlendirme.
       * Hata ilgili sayfada gösterilsin.
       */
      if (
        !allowAnonymous &&
        window.location.pathname !== "/login"
      ) {
        window.location.replace("/login");
      }

      return Promise.reject(error);
    }

    const storedRefreshToken =
      localStorage.getItem(
        REFRESH_TOKEN_KEY,
      );

    /*
     * Refresh token yoksa kullanıcı misafirdir veya
     * oturumu tamamen bitmiştir.
     */
    if (!storedRefreshToken) {
      clearStoredSession();

      /*
       * Misafir erişimine açık endpointlerde login'e atma.
       */
      if (
        !allowAnonymous &&
        window.location.pathname !== "/login"
      ) {
        window.location.replace("/login");
      }

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post("/auth/refresh", {
            refreshToken: storedRefreshToken,
          })
          .then((response) => {
            const responseData =
              response.data?.data ??
              response.data;

            const newAccessToken =
              responseData?.accessToken;

            const newRefreshToken =
              responseData?.refreshToken;

            if (!newAccessToken) {
              throw new Error(
                "Backend yeni access token döndürmedi.",
              );
            }

            localStorage.setItem(
              ACCESS_TOKEN_KEY,
              newAccessToken,
            );

            if (newRefreshToken) {
              localStorage.setItem(
                REFRESH_TOKEN_KEY,
                newRefreshToken,
              );
            }

            return newAccessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken =
        await refreshPromise;

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      clearStoredSession();

      /*
       * Public sayfada bulunan misafir kullanıcıyı
       * login sayfasına zorla gönderme.
       */
      if (
        !allowAnonymous &&
        window.location.pathname !== "/login"
      ) {
        window.location.replace("/login");
      }

      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
