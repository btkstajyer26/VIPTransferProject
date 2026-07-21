import { API_BASE_URL } from '../constants/api';
import { clearAuthSession, getAuthSession } from '../storage/tokenStorage';

const DEFAULT_TIMEOUT_MS = 10000;

function createApiError(status, message, data = null) {
  return {
    status,
    message,
    data,
  };
}

function buildUrl(path, params) {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = String(path).replace(/^\/+/, '');
  const url = `${normalizedBaseUrl}/${normalizedPath}`;

  if (!params || typeof params !== 'object') {
    return url;
  }

  const queryString = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return queryString ? `${url}?${queryString}` : url;
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

function getErrorMessage(data, status) {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object') {
    const message = data.message ?? data.error;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return `İstek başarısız oldu (${status}).`;
}

async function request(
  path,
  {
    method = 'GET',
    body,
    headers = {},
    params,
    requiresAuth = true,
    timeout = DEFAULT_TIMEOUT_MS,
  } = {},
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (requiresAuth) {
      const session = await getAuthSession();

      if (session?.accessToken) {
        const tokenType = session.tokenType || 'Bearer';
        requestHeaders.Authorization = `${tokenType} ${session.accessToken}`;
      }
    }

    const response = await fetch(buildUrl(path, params), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await parseResponse(response);

    if (!response.ok) {
      if (requiresAuth && response.status === 401) {
        await clearAuthSession();
      }

      throw createApiError(response.status, getErrorMessage(data, response.status), data);
    }

    return data;
  } catch (error) {
    if (error?.status !== undefined) {
      throw error;
    }

    if (error?.name === 'AbortError') {
      throw createApiError(0, 'İstek zaman aşımına uğradı.');
    }

    throw createApiError(0, 'Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edin.');
  } finally {
    clearTimeout(timeoutId);
  }
}

const apiClient = {
  request,
};

export default apiClient;
