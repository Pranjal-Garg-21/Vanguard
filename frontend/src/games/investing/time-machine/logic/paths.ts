import { assumptions } from '@/core/market';
import { typicalHigh, typicalLow } from '@/core/market/finance';

/** What a "typical year" looks like for one path, per ₹10,000 held. Read from assumptions.json. */
export function typicalYear(assetId: string, amount = 10000): { low: number; high: number } {
  const a = assumptions.assets[assetId];
  if (!a) throw new Error(`Unknown asset: ${assetId}`);
  return {
    low: typicalLow(amount, a.meanAnnual, a.fee, a.volAnnual),
    high: typicalHigh(amount, a.meanAnnual, a.fee, a.volAnnual),
  };
}
