import raw from '../../content/assumptions.json';

export type Regime = 'calm' | 'boom' | 'crash';

export interface AssetAssumption {
  kind: string;
  meanAnnual: number;
  volAnnual: number;
  fee: number;
  labelKey: string;
}

export interface FundAssumption {
  style: 'index' | 'active' | 'sector' | 'etf';
  /** Yearly cost taken out of the fund (the expense ratio). */
  costYearly: number;
  /** Average yearly growth and swing of what the fund holds, before its cost. Made up, for teaching. */
  meanAnnual: number;
  volAnnual: number;
  tradingCost?: number;
  labelKey: string;
}

export interface Assumptions {
  version: number;
  currency: string;
  disclaimerKey: string;
  inflation: { base: number; low: number; high: number; labelKey: string };
  assets: Record<string, AssetAssumption>;
  funds: Record<string, FundAssumption>;
  /** Days to turn an asset into cash, and the share lost to selling it (fictional, for the liquidity lesson). */
  liquidity: Record<string, { days: number; sellCost: number }>;
  costs: { tradeFee: number; makingCharge: number; propertySellCost: number; propertyUpfront: number };
  simulation: {
    futuresRuns: number;
    maxMonthlyMove: number;
    regimes: Record<Regime, { driftMult: number; volMult: number }>;
    regimeTransitions: Record<Regime, Record<Regime, number>>;
  };
}

/** The single source of numbers for every investing projection. */
export const assumptions = raw as Assumptions;

export function getAsset(id: string): AssetAssumption {
  const asset = assumptions.assets[id];
  if (!asset) throw new Error(`Unknown asset: ${id}`);
  return asset;
}
