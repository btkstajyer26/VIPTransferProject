const TECHNICAL_MESSAGE_PATTERN =
  /exception|hibernate|jdbc|sql|stack trace|java\.|org\.spring|constraint/i;

export function getAdminErrorMessage(error, fallback, notFoundMessage) {
  if (error?.status === 403) return 'Bu işlem için yetkiniz bulunmuyor.';
  if (error?.status === 404) return notFoundMessage;
  if (!error?.status) return 'Bilgiler alınamadı. Lütfen tekrar deneyin.';

  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  return message && !TECHNICAL_MESSAGE_PATTERN.test(message) ? message : fallback;
}

export function unwrapList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data?.content)) return response.data.content;
  return [];
}
