import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_USER_KEY = "authUser";

/*
 * Normal API istekleri bu instance üzerinden gider.
 */
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

/*
 * Refresh isteği ayrı instance üzerinden gönderilir.
 * Böylece refresh endpoint'i 401 döndürürse interceptor döngüsüne girmez.
 */
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

/*
 * Aynı anda birden fazla API isteği 401 döndürürse
 * sadece bir refresh isteği gönderilir.
 */
let refreshPromise = null;

/*
 * Her API isteğine access token eklenir.
 */
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/*
 * 401 gelirse refresh token ile yeni access token alınır
 * ve başarısız olan ilk istek tekrar gönderilir.
 */
apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    /*
     * Sunucudan cevap gelmediyse veya hata 401 değilse
     * normal şekilde hatayı döndür.
     */
    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    /*
     * Aynı istek için yalnızca bir defa refresh denensin.
     * Sonsuz döngüyü önler.
     */
    if (originalRequest._retry) {
      clearStoredSession();

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }

      return Promise.reject(error);
    }

    /*
     * Login ve refresh endpoint'lerinde refresh işlemi yapılmaz.
     */
    const requestUrl = originalRequest.url || "";

    if (
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    const storedRefreshToken =
      localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!storedRefreshToken) {
      clearStoredSession();

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Başka bir refresh işlemi yoksa yeni refresh isteği başlat.
       */
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post("/auth/refresh", {
            refreshToken: storedRefreshToken,
          })
          .then((response) => {
            const {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            } = response.data;

            if (!newAccessToken) {
              throw new Error(
                "Backend yeni access token döndürmedi."
              );
            }

            localStorage.setItem(
              ACCESS_TOKEN_KEY,
              newAccessToken
            );

            /*
             * Backend yeni refresh token döndürürse güncelle.
             * Şu an backend aynı refresh token'ı döndürüyor.
             */
            if (newRefreshToken) {
              localStorage.setItem(
                REFRESH_TOKEN_KEY,
                newRefreshToken
              );
            }

            return newAccessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;

      /*
       * Başarısız olan isteğin Authorization header'ını
       * yeni token ile değiştir.
       */
      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      /*
       * Orijinal isteği yeniden gönder.
       */
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearStoredSession();

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }

      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;