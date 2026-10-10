import { assumptions } from '@/core/market';

/**
 * What a "typical year" looks like for one path, per ₹10,000 held: growth after fees, plus or minus
 * one swing. About 2 years in 3 land inside it; the rest fall outside. Read from assumptions.json.
 */
export function typicalYear(assetId: string, amount = 10000): { low: number; high: number } {
  const a = assumptions.assets[assetId];
  if (!a) throw new Error(`Unknown asset: ${assetId}`);
  const growth = a.meanAnnual - a.fee;
  return { low: amount * (1 + growth - a.volAnnual), high: amount * (1 + growth + a.volAnnual) };
}
