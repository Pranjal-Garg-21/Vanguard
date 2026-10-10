import { describe, expect, it } from 'vitest';

import {
  annualise,
  categoryTotals,
  fromLedger,
  historyFor,
  leaks,
  lineTotal,
  projectHalving,
  scaleToBudget,
  synthesiseHistory,
  totalOf,
  type Txn,
} from './history';
import { disposableIncome } from '../../shared/economics';
import type { MiniGameContext } from '@/core/types';

const ctxFor = (persona: Record<string, unknown>, seed = 1): MiniGameContext => ({
  persona,
  level: 1,
  seed,
  stateSlice: {},
  mode: 'arcade',
});

const personas = [
  { lifeStage: 'school_student', circumstance: 'dependent' },
  { lifeStage: 'college_student', circumstance: 'part_time_earner' },
  { lifeStage: 'first_earner', circumstance: 'family_contributor' },
];

describe('the generated month', () => {
  it('never spends more than the character actually had', () => {
    // A history that exceeds their income would teach only that the game is
    // not paying attention.
    for (const persona of personas) {
      const history = synthesiseHistory(ctxFor(persona));
      const budget = Math.max(400, disposableIncome(persona));
      expect(totalOf(history), JSON.stringify(persona)).toBeLessThanOrEqual(budget);
    }
  });

  it('always contains something that repeats, or there is no lesson', () => {
    for (const persona of personas) {
      expect(leaks(synthesiseHistory(ctxFor(persona))).length).toBeGreaterThan(0);
    }
  });

  it('replays identically for the same seed', () => {
    const persona = personas[0]!;
    expect(synthesiseHistory(ctxFor(persona, 99))).toEqual(
      synthesiseHistory(ctxFor(persona, 99)),
    );
  });

  it('differs between seeds', () => {
    const persona = personas[1]!;
    expect(synthesiseHistory(ctxFor(persona, 1))).not.toEqual(
      synthesiseHistory(ctxFor(persona, 2)),
    );
  });

  it('drops a line entirely rather than leaving an unaffordable row', () => {
    const txns: Txn[] = [
      { id: 'a', textKey: 'a', category: 'chai', amount: 100, count: 5, repeated: true },
    ];
    expect(scaleToBudget(txns, 10)).toEqual([]);
  });

  it('funds the cheapest habit first, because it counts highest', () => {
    const txns: Txn[] = [
      { id: 'big', textKey: 'big', category: 'other', amount: 200, count: 3, repeated: true },
      { id: 'chai', textKey: 'chai', category: 'chai', amount: 20, count: 22, repeated: true },
    ];
    const kept = scaleToBudget(txns, 1000);
    expect(kept.find((t) => t.id === 'chai')?.count).toBe(22);
    expect(totalOf(kept)).toBeLessThanOrEqual(1000);
  });

  it('never returns a row with no occurrences', () => {
    for (const budget of [0, 10, 100, 450, 5000]) {
      const kept = scaleToBudget(
        [{ id: 'a', textKey: 'a', category: 'chai', amount: 20, count: 10, repeated: true }],
        budget,
      );
      expect(kept.every((t) => t.count >= 1)).toBe(true);
    }
  });
});

describe('reading a real ledger when the runtime provides one', () => {
  it('groups repeated reasons and marks them as repeats', () => {
    const txns = fromLedger([
      { amount: -20, reasonKey: 'sm02.txn.chai', category: 'chai' },
      { amount: -20, reasonKey: 'sm02.txn.chai', category: 'chai' },
      { amount: -180, reasonKey: 'sm02.txn.delivery', category: 'delivery' },
    ]);
    const chai = txns.find((t) => t.id === 'sm02.txn.chai')!;
    expect(chai.count).toBe(2);
    expect(chai.repeated).toBe(true);
    expect(txns.find((t) => t.id === 'sm02.txn.delivery')!.repeated).toBe(false);
  });

  it('ignores zero-value entries', () => {
    expect(fromLedger([{ amount: 0, reasonKey: 'x' }])).toEqual([]);
  });

  it('falls back to a generated month when the ledger is too thin', () => {
    const ctx = {
      ...ctxFor(personas[0]!),
      stateSlice: { ledger: [{ amount: -20, reasonKey: 'sm02.txn.chai' }] },
    } as MiniGameContext;
    // One entry is not a month; showing it would be a stub, not a history.
    expect(historyFor(ctx).length).toBeGreaterThan(1);
  });
});

describe('the numbers the student is shown', () => {
  const txns: Txn[] = [
    { id: 'chai', textKey: 'chai', category: 'chai', amount: 20, count: 22, repeated: true },
    { id: 'game', textKey: 'game', category: 'games', amount: 49, count: 6, repeated: true },
    { id: 'gift', textKey: 'gift', category: 'other', amount: 250, count: 1, repeated: false },
  ];

  it('totals a line by unit price times count', () => {
    expect(lineTotal(txns[0]!)).toBe(440);
  });

  it('turns a monthly habit into a yearly figure', () => {
    // The ₹440/month → ₹5,280/year line from §12.6.
    expect(annualise(440)).toBe(5280);
  });

  it('ranks the leaks biggest first and leaves one-offs out', () => {
    expect(leaks(txns).map((t) => t.id)).toEqual(['chai', 'game']);
  });

  it('shares add up to the whole month', () => {
    const totals = categoryTotals(txns);
    expect(totals.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1, 10);
    expect(totals[0]!.category).toBe('chai');
  });

  it('projects what halving one habit returns', () => {
    expect(projectHalving(440, 6)).toBe(1320);
  });

  it('handles an empty month without dividing by zero', () => {
    expect(categoryTotals([])).toEqual([]);
    expect(totalOf([])).toBe(0);
  });
});
