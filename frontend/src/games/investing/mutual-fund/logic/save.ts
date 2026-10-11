/** What the Mutual Fund Challenge saves (your fund and plan), and a strict reader for it. */
import raw from '@/content/scenarios/invest/mutual_fund.json';
import { assumptions, type FundPlan } from '@/core/market';

type Limits = Record<'lump' | 'sip', { min: number; max: number; step: number }> & { years: { min: number; max: number } };
const LIMITS = (raw as unknown as { plan: Limits }).plan;

export interface MutualFundSave {
  fundId: string;
  plan: FundPlan;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseMutualFundSave(value: unknown): MutualFundSave | null {
  if (!isRecord(value) || !isRecord(value.plan)) return null;
  const { fundId } = value;
  const { method, amount, years } = value.plan;
  if (typeof fundId !== 'string' || !assumptions.funds[fundId]) return null;
  if (method !== 'lump' && method !== 'sip') return null;
  const lim = LIMITS[method];
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < lim.min || amount > lim.max || !Number.isInteger(amount / lim.step)) return null;
  if (typeof years !== 'number' || !Number.isInteger(years) || years < LIMITS.years.min || years > LIMITS.years.max) return null;
  return { fundId, plan: { method, amount, years } };
}
