import apiClient from '../api/apiClient';
import {
  AUTH_FORGOT_PASSWORD_PATH,
  AUTH_LOGIN_PATH,
  AUTH_REGISTER_PATH,
  AUTH_RESEND_CODE_PATH,
  AUTH_RESET_PASSWORD_PATH,
  AUTH_VERIFY_EMAIL_PATH,
} from '../constants/api';
import { clearAuthSession, saveAuthSession } from '../storage/tokenStorage';

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

export async function register(registerRequest) {
  const response = await apiClient.request(AUTH_REGISTER_PATH, {
    method: 'POST',
    body: {
      firstName: registerRequest?.firstName,
      lastName: registerRequest?.lastName,
      email: registerRequest?.email,
      phoneNumber: registerRequest?.phoneNumber,
      password: registerRequest?.password,
    },
    requiresAuth: false,
  });

  return response?.data ?? response;
}

export async function verifyEmail(verifyRequest) {
  const response = await apiClient.request(AUTH_VERIFY_EMAIL_PATH, {
    method: 'POST',
    body: {
      email: verifyRequest?.email,
      code: verifyRequest?.code,
    },
    requiresAuth: false,
  });

  return response?.data ?? response;
}

export async function resendVerificationCode(email) {
  const response = await apiClient.request(AUTH_RESEND_CODE_PATH, {
    method: 'POST',
    body: { email },
    requiresAuth: false,
  });

  return response?.data ?? response;
}

export async function forgotPassword(email) {
  const response = await apiClient.request(AUTH_FORGOT_PASSWORD_PATH, {
    method: 'POST',
    body: { email },
    requiresAuth: false,
  });

  return response?.data ?? response;
}

export async function resetPassword(resetRequest) {
  const response = await apiClient.request(AUTH_RESET_PASSWORD_PATH, {
    method: 'POST',
    body: {
      email: resetRequest?.email,
      code: resetRequest?.code,
      newPassword: resetRequest?.newPassword,
    },
    requiresAuth: false,
  });

  return response?.data ?? response;
}