/** Display formatting for money and percentages. Pure, so charts, lessons and games all agree. */

export type Fmt = 'rupees' | 'percent' | 'number';

/** Indian digit grouping: 1234567 -> 12,34,567. Stand-in for P3's shared formatter. */
export function formatRupees(n: number, round = 0): string {
  const s = new Intl.NumberFormat('en-IN', { minimumFractionDigits: round, maximumFractionDigits: round }).format(Math.abs(n));
  return `${n < 0 ? '-' : ''}₹${s}`;
}

export function formatValue(raw: number, fmt: Fmt = 'number', round = 0): string {
  if (fmt === 'rupees') return formatRupees(raw, round);
  if (fmt === 'percent') return `${Number((raw * 100).toFixed(round))}%`;
  return Number(raw.toFixed(round)).toLocaleString('en-IN', { maximumFractionDigits: round });
}
