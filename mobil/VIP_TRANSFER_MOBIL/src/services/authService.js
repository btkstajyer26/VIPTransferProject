import apiClient from '../api/apiClient';
import { AUTH_LOGIN_PATH } from '../constants/api';
import { clearAuthSession, saveAuthSession } from '../storage/tokenStorage';

const VERIFY_EMAIL_PATH = '/api/auth/verify-email';
const RESEND_VERIFICATION_CODE_PATH = '/api/auth/resend-code';

function isValidLoginResponse(response) {
  return (
    response &&
    typeof response === 'object' &&
    typeof response.accessToken === 'string' &&
    Boolean(response.accessToken.trim()) &&
    typeof response.tokenType === 'string' &&
    Boolean(response.tokenType.trim()) &&
    typeof response.role === 'string' &&
    Boolean(response.role.trim())
  );
}

export async function login(loginRequest) {
  const response = await apiClient.request(AUTH_LOGIN_PATH, {
    method: 'POST',
    body: {
      phoneNumber: loginRequest?.phoneNumber,
      password: loginRequest?.password,
    },
    requiresAuth: false,
  });
  const payload = response?.data ?? response;

  if (!isValidLoginResponse(payload)) {
    throw {
      status: 0,
      message: 'Sunucudan geçersiz giriş yanıtı alındı.',
      data: null,
    };
  }

  const session = await saveAuthSession(payload);

  if (!session) {
    throw {
      status: 0,
      message: 'Oturum bilgileri güvenli şekilde kaydedilemedi.',
      data: null,
    };
  }

  return session;
}

export async function logout() {
  await clearAuthSession();
}

export function verifyEmail(email, code) {
  return apiClient.request(VERIFY_EMAIL_PATH, {
    method: 'POST',
    body: { email, code },
    requiresAuth: false,
  });
}

export function resendVerificationCode(email) {
  return apiClient.request(RESEND_VERIFICATION_CODE_PATH, {
    method: 'POST',
    body: { email },
    requiresAuth: false,
  });
}
