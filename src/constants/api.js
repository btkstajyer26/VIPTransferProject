export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '';

if (__DEV__ && !API_BASE_URL) {
  console.warn(
    'EXPO_PUBLIC_API_BASE_URL tanımlı değil. Yerel geliştirme için .env.example dosyasını .env olarak kopyalayıp API adresini güncelleyin.',
  );
}

export const AUTH_LOGIN_PATH = '/api/v1/auth/login';

export const API_ENDPOINTS = {
  LOGIN: AUTH_LOGIN_PATH,
};
