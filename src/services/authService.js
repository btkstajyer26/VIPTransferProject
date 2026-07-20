import apiClient from '../api/apiClient';
import { AUTH_LOGIN_PATH } from '../constants/api';
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

  if (!isValidLoginResponse(response)) {
    throw {
      status: 0,
      message: 'Sunucudan geçersiz giriş yanıtı alındı.',
      data: null,
    };
  }

  const session = await saveAuthSession(response);

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
