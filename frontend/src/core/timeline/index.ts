/**
 * The What-If Machine: checkpoints before big decisions, rewinding to one,
 * and comparing two lives. A branch keeps the world seed, so the market,
 * income luck and story shocks are the same; only the choices differ.
 * Pure. Owner: P1.
 */
import { debtTotal, emergencyFund, netWorth, type LifeState } from '@/core/engine';
import type { Pos } from '@/core/world';

export type Checkpoint = {
  id: string;
  /** Translation key naming the decision, e.g. "checkpoint.crack". */
  label: string;
  month: number;
  chapter: number;
  /** The state and place at the start of the scene, and the scene to replay. */
  life: LifeState;
  pos: Pos;
  script: string;
};

export type OtherLife = { life: LifeState; pos: Pos; checkpoints: Checkpoint[]; label: string };

export const MAX_CHECKPOINTS = 12;

/** Adds a checkpoint, replacing an older one for the same decision, keeping the newest MAX. */
export function addCheckpoint(list: Checkpoint[], cp: Checkpoint): Checkpoint[] {
  return [...list.filter((c) => c.label !== cp.label), cp].slice(-MAX_CHECKPOINTS);
}

export type Rewind = { life: LifeState; pos: Pos; checkpoints: Checkpoint[]; replay: string; other: OtherLife };

/** Goes back to a checkpoint. The life you leave becomes the "other life" you can compare with or return to. */
export function rewind(current: { life: LifeState; pos: Pos; checkpoints: Checkpoint[] }, id: string, otherLabel: string): Rewind | null {
  const idx = current.checkpoints.findIndex((c) => c.id === id);
  const cp = current.checkpoints[idx];
  if (!cp) return null;
  return {
    life: structuredClone(cp.life),
    pos: cp.pos,
    // Later checkpoints belong to the life you left.
    checkpoints: current.checkpoints.slice(0, idx + 1),
    replay: cp.script,
    other: { life: current.life, pos: current.pos, checkpoints: current.checkpoints, label: otherLabel },
  };
}

/** Money that went to scams and schemes. */
export function scamLosses(s: LifeState): number {
  return -s.ledger.filter((e) => /^(scam|ponzi)/.test(e.reason) && e.amount < 0).reduce((sum, e) => sum + e.amount, 0);
}

/** Interest and fees paid on debt. */
export function debtCost(s: LifeState): number {
  const paid = s.ledger.filter((e) => /^(emi|late_fee)/.test(e.reason)).reduce((sum, e) => sum - e.amount, 0);
  const borrowed = s.loans.reduce((sum, l) => sum + l.principal - l.balance, 0);
  return Math.max(0, Math.round(paid - borrowed));
}

export type Metric = 'worth' | 'savings' | 'debt' | 'scams' | 'peace' | 'goal' | 'badges';

export type Comparison = { metric: Metric; a: number; b: number }[];

export function compare(a: LifeState, b: LifeState): Comparison {
  const row = (metric: Metric, f: (s: LifeState) => number) => ({ metric, a: f(a), b: f(b) });
  return [
    row('worth', netWorth),
    row('savings', emergencyFund),
    row('debt', debtTotal),
    row('scams', scamLosses),
    row('peace', (s) => s.peace),
    row('goal', (s) => s.goalsDone.length),
    row('badges', (s) => s.badges.length),
  ];
}

/** The biggest differences, as explanation keys, most important first. */
export function explain(c: Comparison): { key: string; amount: number; better: 'a' | 'b' }[] {
  const get = (m: Metric) => c.find((r) => r.metric === m)!;
  const out: { key: string; amount: number; better: 'a' | 'b' }[] = [];
  const add = (m: Metric, key: string, higherIsBetter: boolean, min: number) => {
    const r = get(m);
    const diff = r.a - r.b;
    if (Math.abs(diff) < min) return;
    out.push({ key, amount: Math.abs(diff), better: diff > 0 === higherIsBetter ? 'a' : 'b' });
  };
  add('scams', 'whatif.why.scams', false, 1);
  add('debt', 'whatif.why.debt', false, 100);
  add('savings', 'whatif.why.savings', true, 100);
  add('peace', 'whatif.why.peace', true, 10);
  add('worth', 'whatif.why.worth', true, 100);
  return out.sort((x, y) => y.amount - x.amount).slice(0, 3);
}
