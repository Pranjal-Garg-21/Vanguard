import { describe, expect, it } from 'vitest';

import { buildStatement, settleBills, HEAVY_NEEDS_SHARE } from './statement';
import { characterBills, characterIncome, billsTotalFor } from '../../shared/economics';
import type { Bill } from '../../shared/economics';

const bills: Bill[] = [
  { id: 'bus_pass', textKey: 'pb02.bill.bus_pass', amount: 300 },
  { id: 'recharge', textKey: 'pb02.bill.recharge', amount: 50 },
];

describe('settling the bills', () => {
  it('pays what it can, cheapest first', () => {
    // ₹100 covers the ₹50 recharge but not the ₹300 bus pass.
    const { paid, missed } = settleBills(bills, 100);
    expect(paid.map((b) => b.id)).toEqual(['recharge']);
    expect(missed.map((b) => b.id)).toEqual(['bus_pass']);
  });

  it('pays everything when the jar covers the total', () => {
    expect(settleBills(bills, 350).missed).toEqual([]);
  });

  it('pays nothing from an empty jar', () => {
    expect(settleBills(bills, 0).paid).toEqual([]);
  });
});

describe('the month-end verdict', () => {
  const statement = (allocations: Record<string, number>, income = 800) =>
    buildStatement(income, bills, allocations);

  it('leads with an unpaid bill, whatever else went right', () => {
    const s = statement({ needs: 100, wants: 0, future: 700 });
    expect(s.verdictKey).toBe('pb02.verdict.missed_bills');
  });

  it('acknowledges heavy needs rather than questioning them', () => {
    // A contributor whose needs take most of the income has not made a
    // mistake, and §12.6 requires the feedback to say so.
    const s = statement({ needs: 600, wants: 100, future: 100 });
    expect(s.needsShare).toBeGreaterThanOrEqual(HEAVY_NEEDS_SHARE);
    expect(s.verdictKey).toBe('pb02.verdict.heavy_needs');
  });

  it('nudges when nothing at all was kept', () => {
    expect(statement({ needs: 350, wants: 450, future: 0 }).verdictKey).toBe(
      'pb02.verdict.nothing_future',
    );
  });

  it('does not praise saving everything', () => {
    // A plan with no Wants is one nobody repeats, which teaches the opposite
    // of budgeting.
    expect(statement({ needs: 350, wants: 0, future: 450 }).verdictKey).toBe(
      'pb02.verdict.all_future',
    );
  });

  it('approves a plan that covers the bills and keeps something', () => {
    expect(statement({ needs: 350, wants: 250, future: 200 }).verdictKey).toBe(
      'pb02.verdict.good',
    );
  });

  it('counts the Emergency jar as money kept', () => {
    const s = statement({ needs: 350, wants: 250, future: 100, emergency: 100 });
    expect(s.futureKept).toBe(200);
  });
});

describe('every persona can afford their own bills', () => {
  // If a starting state cannot cover its own needs, the game opens in a state
  // the student cannot solve. This is the guard on that.
  const personas = [
    { lifeStage: 'school_student', circumstance: 'dependent' },
    { lifeStage: 'school_student', circumstance: 'family_contributor' },
    { lifeStage: 'school_student', circumstance: 'part_time_earner' },
    { lifeStage: 'college_student', circumstance: 'dependent' },
    { lifeStage: 'college_student', circumstance: 'part_time_earner' },
    { lifeStage: 'college_student', circumstance: 'family_contributor' },
    { lifeStage: 'first_earner', circumstance: 'family_contributor' },
    { lifeStage: 'first_earner', circumstance: 'young_entrepreneur' },
  ];

  for (const persona of personas) {
    it(`${persona.lifeStage} · ${persona.circumstance} has money left after needs`, () => {
      const income = characterIncome(persona).amount;
      const needs = billsTotalFor(persona);
      expect(needs, 'needs must not exceed income').toBeLessThan(income);
      expect(characterBills(persona).length).toBeGreaterThan(0);
    });
  }

  it('still makes a contributor feel the squeeze', () => {
    // The point is not that it is comfortable — needs should take a big share,
    // near the ~80% §12.6 describes, just never more than everything.
    const contributor = { lifeStage: 'college_student', circumstance: 'family_contributor' };
    const share = billsTotalFor(contributor) / characterIncome(contributor).amount;
    expect(share).toBeGreaterThan(0.6);
    expect(share).toBeLessThan(1);
  });
});
