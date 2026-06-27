/**
 * Formats a number to a currency string.
 */
export function formatCurrency(amount: number | string, currencyCode: string = 'INR'): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount || '0');
  const symbolMap: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };
  const symbol = symbolMap[currencyCode] || symbolMap['INR'];
  return `${symbol}${num.toFixed(2)}`;
}

/**
 * Formats a timestamp into a readable date and time string.
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a timestamp to a simple date-only representation.
 */
export function formatDateOnly(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
