import { describe, it, expect } from 'vitest';
import { assumptions, compareFunds, runFundFutures, simulateFund, type FundPlan } from '@/core/market';
import { t } from '@/platform';
import { notesFor, type Note } from './notes';

const sip: FundPlan = { method: 'sip', amount: 1000, years: 10 };
const lump: FundPlan = { method: 'lump', amount: 50000, years: 10 };
const fundName = (id: string) => t(assumptions.funds[id]!.labelKey);

function notes(fundId: string, plan: FundPlan) {
  const run = simulateFund(fundId, plan, 'class-1');
  const all = compareFunds(plan, 'class-1');
  const futures = runFundFutures(fundId, plan, 'class-1', 200);
  return notesFor({ fundId, plan, run, futures, all, fundName });
}
const keys = (ns: Note[]) => ns.map((n) => n.key);
const say = (n: Note) => t(`mutualfund.note.${n.key}`, n.vars);

describe('fund notes', () => {
  it('a SIP gets the units-in-a-dip lesson and the average-cost line; a lump sum does not', () => {
    expect(keys(notes('index_basket', sip))).toEqual(expect.arrayContaining(['sip.units', 'sip.average']));
    expect(keys(notes('index_basket', lump))).not.toContain('sip.units');
  });

  it('every run reports the result, the cost of the yearly fee and a closing question', () => {
    for (const id of Object.keys(assumptions.funds)) {
      const ks = keys(notes(id, lump));
      expect(ks).toEqual(expect.arrayContaining(['result', 'cost', 'think.noBest']));
    }
  });

  it('only the ETF mentions trading cost', () => {
    expect(keys(notes('index_etf', sip))).toContain('etf.trading');
    expect(keys(notes('index_basket', sip))).not.toContain('etf.trading');
  });

  it('compares a non-index fund with the index fund, as fact, and never when you picked the index fund', () => {
    const active = keys(notes('active_growth', lump));
    expect(active.some((k) => k.startsWith('vsIndex.'))).toBe(true);
    expect(keys(notes('index_basket', lump)).some((k) => k.startsWith('vsIndex.'))).toBe(false);
  });

  it('gives each fund type a question that fits it', () => {
    expect(keys(notes('sector_focus', lump))).toContain('think.sector');
    expect(keys(notes('active_growth', lump))).toContain('think.active');
    expect(keys(notes('index_etf', lump))).toContain('think.etf');
  });

  it('every note reads well and never tells you which fund to pick', () => {
    const all = Object.keys(assumptions.funds).flatMap((id) => [...notes(id, sip), ...notes(id, lump)]);
    for (const n of all) {
      const text = say(n);
      expect(text, n.key).not.toMatch(/[{}]|^mutualfund\./);
      for (const s of text.split(/(?<=[.!?])\s+/)) expect(s.split(/\s+/).length, `${n.key}: ${s}`).toBeLessThanOrEqual(26);
      expect(text, n.key).not.toMatch(/\b(you should|you must|best fund|buy this|pick this|recommend)\b/i);
    }
  });

  it('think notes ask or warn; the last one always reminds you there is no best fund', () => {
    const ns = notes('index_basket', lump);
    expect(ns[ns.length - 1]!.key).toBe('think.noBest');
    expect(say(ns[ns.length - 1]!)).toContain('?');
  });
});
