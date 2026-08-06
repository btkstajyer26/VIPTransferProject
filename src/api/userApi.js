import apiClient from './apiClient';

const CURRENT_USER_PATH = '/api/users/me';

function rethrowApiError(error, fallbackMessage) {
  throw {
    status: error?.status ?? 0,
    message: error?.message || fallbackMessage,
    data: error?.data ?? null,
  };
}

export async function getCurrentUser() {
  try {
    return await apiClient.request(CURRENT_USER_PATH);
  } catch (error) {
    rethrowApiError(error, 'Kullanıcı bilgileri alınamadı.');
  }
}

export async function updateCurrentUser(updateRequest) {
  try {
    return await apiClient.request(CURRENT_USER_PATH, {
      method: 'PATCH',
      body: {
        firstName: updateRequest?.firstName,
        lastName: updateRequest?.lastName,
        email: updateRequest?.email,
        preferredLang: updateRequest?.preferredLang,
      },
    });
  } catch (error) {
    rethrowApiError(error, 'Profil güncellenemedi.');
  }
}

export async function changeCurrentUserPassword(changePasswordRequest) {
  try {
    return await apiClient.request(`${CURRENT_USER_PATH}/password`, {
      method: 'PATCH',
      body: {
        currentPassword: changePasswordRequest?.currentPassword,
        newPassword: changePasswordRequest?.newPassword,
        confirmPassword: changePasswordRequest?.confirmPassword,
      },
    });
  } catch (error) {
    rethrowApiError(error, 'Şifre değiştirilemedi.');
  }
}
