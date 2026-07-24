function padNumber(value) {
  return String(value).padStart(2, '0');
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatTime(date) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

export function createScheduledDate(selectedDate, selectedTime) {
  if (!selectedDate || !selectedTime) {
    return null;
  }

  return new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    selectedTime.getHours(),
    selectedTime.getMinutes(),
    0,
    0,
  );
}

export function formatScheduledTime(selectedDate, selectedTime) {
  const scheduledDate = createScheduledDate(selectedDate, selectedTime);

  if (!scheduledDate) {
    return null;
  }

  return scheduledDate.toISOString();
}
