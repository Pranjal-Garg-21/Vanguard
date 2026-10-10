/**
 * What to say after a fund run: what happened in this market, and a question worth thinking about.
 * Pure: returns message keys and numbers; the screen turns them into words. It never says which fund to pick.
 */
import { formatRupees, formatValue, type FundFutures, type FundPlan, type FundRun, months, sipFacts } from '@/core/market';

export interface Note {
  kind: 'happened' | 'think';
  tone: 'good' | 'warn' | 'info';
  /** A key under mutualfund.note.* */
  key: string;
  vars: Record<string, string | number>;
}

const money = (n: number) => formatRupees(n);
const signed = (n: number) => `${n > 0 ? '+' : ''}${formatRupees(n)}`;
const pct = (x: number) => formatValue(x, 'percent', 1);

export interface NotesInput {
  fundId: string;
  plan: FundPlan;
  run: FundRun;
  futures: FundFutures;
  /** Final value of every fund in the same market. */
  all: Record<string, FundRun>;
  fundName: (id: string) => string;
}

export function notesFor(i: NotesInput): Note[] {
  const out: Note[] = [];
  const say = (kind: Note['kind'], tone: Note['tone'], key: string, vars: Note['vars'] = {}) => out.push({ kind, tone, key, vars });
  const { run, plan } = i;
  const gain = run.finalValue - run.totalInvested;

  say('happened', gain >= 0 ? 'good' : 'warn', 'result', {
    invested: money(run.totalInvested),
    value: money(run.finalValue),
    gain: signed(gain),
    pct: pct(gain / run.totalInvested),
    years: plan.years,
  });

  if (plan.method === 'sip') {
    const f = sipFacts(run);
    say('happened', 'info', 'sip.units', {
      cheap: f.cheapestMonth,
      nav: money(run.nav[f.cheapestMonth - 1] ?? 0),
      amount: money(plan.amount),
      units: f.unitsAtCheapest.toFixed(1),
      dear: f.dearestMonth,
      navHigh: money(run.nav[f.dearestMonth - 1] ?? 0),
      unitsHigh: f.unitsAtDearest.toFixed(1),
    });
    say('happened', 'good', 'sip.average', { avg: money(f.averageCost), avgNav: money(f.averageNav) });
  }

  if (run.maxDrawdown >= 0.1) {
    say('happened', 'warn', 'dip', { dd: pct(run.maxDrawdown) });
  }

  say('happened', 'info', 'cost', { drag: money(run.costDrag), pct: pct(run.finalValue > 0 ? run.costDrag / run.finalValue : 0), years: plan.years });

  if (run.tradingCostPaid > 0) {
    const purchases = plan.method === 'sip' ? months(plan) : 1;
    say('happened', 'info', 'etf.trading', { total: money(run.tradingCostPaid), n: purchases });
  }

  // How the chosen fund did against the plain index fund in the same market. Facts, not a verdict.
  if (i.fundId !== 'index_basket') {
    const index = i.all.index_basket;
    if (index) {
      const diff = run.finalValue - index.finalValue;
      say('happened', 'info', diff >= 0 ? 'vsIndex.above' : 'vsIndex.below', { name: i.fundName(i.fundId), amount: money(Math.abs(diff)), index: i.fundName('index_basket') });
    }
  }

  const lossChance = i.futures.summary.lossProbability;
  if (lossChance >= 0.1) {
    say('think', 'warn', 'think.loss', { chance: `${Math.round(lossChance * 100)}%` });
  } else {
    say('think', 'info', 'think.neverZero');
  }
  if (i.fundId === 'sector_focus') say('think', 'info', 'think.sector');
  if (i.fundId === 'active_growth') say('think', 'info', 'think.active');
  if (i.fundId === 'index_etf') say('think', 'info', 'think.etf');
  say('think', 'info', 'think.noBest');
  return out;
}
