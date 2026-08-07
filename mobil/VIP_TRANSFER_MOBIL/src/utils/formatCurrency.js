export function formatCurrency(value, currency = 'TRY') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';

  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'TRY',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${currency || ''}`.trim();
  }
}
