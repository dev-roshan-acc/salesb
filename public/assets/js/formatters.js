/**
 * Number and date formatting utilities.
 */
export const numberFormatter = new Intl.NumberFormat("en-IN");

export function formatMoney(value) {
  const number = Number(value) || 0;

  if (Math.abs(number) >= 1e7) {
    return `${(number / 1e7).toFixed(2)} Cr`;
  }

  if (Math.abs(number) >= 1e5) {
    return `${(number / 1e5).toFixed(2)} L`;
  }

  return numberFormatter.format(Math.round(number));
}

export function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}
