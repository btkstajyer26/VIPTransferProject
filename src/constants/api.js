export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '';

if (__DEV__ && !API_BASE_URL) {
  console.warn(
    'EXPO_PUBLIC_API_BASE_URL tanımlı değil. Yerel geliştirme için .env.example dosyasını .env olarak kopyalayıp API adresini güncelleyin.',
  );
}

export const AUTH_LOGIN_PATH = '/api/auth/login';
export const AUTH_REGISTER_PATH = '/api/auth/register';
export const AUTH_VERIFY_EMAIL_PATH = '/api/auth/verify-email';
export const AUTH_RESEND_CODE_PATH = '/api/auth/resend-code';
export const AUTH_FORGOT_PASSWORD_PATH = '/api/auth/forgot-password';
export const AUTH_RESET_PASSWORD_PATH = '/api/auth/reset-password';

export const API_ENDPOINTS = {
  LOGIN: AUTH_LOGIN_PATH,
  REGISTER: AUTH_REGISTER_PATH,
  VERIFY_EMAIL: AUTH_VERIFY_EMAIL_PATH,
  RESEND_CODE: AUTH_RESEND_CODE_PATH,
  FORGOT_PASSWORD: AUTH_FORGOT_PASSWORD_PATH,
  RESET_PASSWORD: AUTH_RESET_PASSWORD_PATH,
};
