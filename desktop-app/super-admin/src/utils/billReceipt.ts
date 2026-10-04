/** Receipts packed per A4 bond paper (content-sized, with cut margins). */
export const RECEIPTS_PER_PAGE = 3;

/** '2026-05' -> '05-2026' (matches printed BKWB receipts). */
export function formatPeriodMMYYYY(period: string | null | undefined): string {
  if (!period) return '—';
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${m[2]}-${m[1]}`;
  return period;
}

export function formatReceiptDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatReading(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return String(Math.round(value));
}
