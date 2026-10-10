import type { RoomQuestion, VarDef, CalcDef } from '../../lessons/logic/types';

export type VolClass = 'low' | 'medium' | 'high';
export type Tone = 'open' | 'good' | 'bad' | 'noise' | 'rumour' | 'dividend';

export interface Company {
  id: string;
  ticker: string;
  nameKey: string;
  taglineKey: string;
  sector: string;
  startPrice: number;
  /** Paid per share, at each dividend round. */
  dividend: number;
  vol: VolClass;
}

/** A move for one company, or for 'market' (every company). 0.1 = +10%. */
export interface Effect {
  target: string;
  pct: number;
}

export interface NewsCard {
  round: number;
  id: string;
  textKey: string;
  tone: Tone;
  effects: Effect[];
  /** Company id that shuts down this round: price collapses and stays near zero. */
  fail?: string;
}

export interface MarketConfig {
  cash: number;
  rounds: number;
  dividendRounds: number[];
  driftAnnual: number;
  volClasses: Record<VolClass, number>;
  rumour: { company: string; round: number };
  drop: { round: number };
  companies: Company[];
  news: NewsCard[];
  check: { vars: Record<string, VarDef>; calcs: CalcDef[]; questions: RoomQuestion[] };
}

export interface Trade {
  round: number;
  id: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  fee: number;
}

export interface Portfolio {
  cash: number;
  shares: Record<string, number>;
  fees: number;
  dividends: number;
  trades: Trade[];
}

export type Market = {
  /** prices[id][i] is the price in round i + 1. */
  prices: Record<string, number[]>;
};
