import { formatRupees, formatValue } from '@/core/market';

/** "+8%" or "-12%". The sign is always shown, so colour is never the only signal. */
export const signedPct = (x: number): string => `${x > 0 ? '+' : ''}${formatValue(x, 'percent', 1)}`;

export const price = (n: number): string => formatRupees(n, 2);
export const money = (n: number): string => formatRupees(n);
export const signedMoney = (n: number): string => `${n > 0 ? '+' : ''}${formatRupees(n)}`;
