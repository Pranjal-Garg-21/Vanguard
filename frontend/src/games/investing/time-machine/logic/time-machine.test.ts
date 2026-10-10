import { describe, it, expect } from 'vitest';
import rulesFile from '@/content/scenarios/invest/time_machine.json';
import { t } from '@/platform';
import { pickInsight, tenths, type InsightFacts, type InsightRule } from './insight';
import { defaultMix, MIX_IDS, setShare, toWeights, type Mix } from './mix';
import { typicalYear } from './paths';
import { validateEvent } from '@shared/telemetry/event';
import { runTimeMachine, timeMachineChoice } from './run';

const rules = rulesFile.rules as InsightRule[];
const goals = rulesFile.goals;
const total = (m: Mix) => m.steady_box + m.mixed_basket + m.bumpy_ride;

describe('mix', () => {
  it('always totals 100 in steps of 5, whatever is dragged', () => {
    for (const id of MIX_IDS) {
      for (let v = 0; v <= 100; v += 5) {
        for (const start of [defaultMix, { steady_box: 100, mixed_basket: 0, bumpy_ride: 0 }, { steady_box: 0, mixed_basket: 0, bumpy_ride: 100 }]) {
          const m = setShare(start, id, v);
          expect(total(m)).toBe(100);
          expect(m[id]).toBe(v);
          for (const x of MIX_IDS) {
            expect(m[x] % 5).toBe(0);
            expect(m[x]).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it('rescales the other two in proportion', () => {
    expect(setShare({ steady_box: 50, mixed_basket: 30, bumpy_ride: 20 }, 'steady_box', 0)).toEqual({
      steady_box: 0,
      mixed_basket: 60,
      bumpy_ride: 40,
    });
  });

  it('splits evenly when both others are at zero', () => {
    const m = setShare({ steady_box: 100, mixed_basket: 0, bumpy_ride: 0 }, 'steady_box', 60);
    expect(total(m)).toBe(100);
    expect(m.mixed_basket).toBeGreaterThan(0);
    expect(m.bumpy_ride).toBeGreaterThan(0);
  });

  it('turns percents into fractions for the engine', () => {
    expect(toWeights(defaultMix)).toEqual({ steady_box: 0.4, mixed_basket: 0.4, bumpy_ride: 0.2 });
  });
});

describe('insight rules', () => {
  const base: InsightFacts = { years: 5, steadyShare: 40, bumpyShare: 20, lossChance: 0.05, goalChance: 0.5, p5BelowInvested: false };

  it('ends with a catch-all rule so something always matches', () => {
    expect(rules[rules.length - 1]!.when).toEqual({});
    expect(pickInsight(rules, base).id).toBe('default');
  });

  it('warns about a close deadline only when the bad case really lost money', () => {
    expect(pickInsight(rules, { ...base, years: 2, p5BelowInvested: true }).id).toBe('short_deadline');
    expect(pickInsight(rules, { ...base, years: 2, p5BelowInvested: false }).id).toBe('default');
  });

  it('picks by what the numbers show', () => {
    expect(pickInsight(rules, { ...base, bumpyShare: 90 }).id).toBe('all_bumpy');
    expect(pickInsight(rules, { ...base, years: 15, steadyShare: 90 }).id).toBe('steady_and_long');
    expect(pickInsight(rules, { ...base, lossChance: 0.3 }).id).toBe('loss_chance');
    expect(pickInsight(rules, { ...base, years: 15 }).id).toBe('long_wait');
  });

  it('describes futures in tenths a student can picture', () => {
    expect(tenths(0)).toEqual({ key: 'timemachine.tenths.none' });
    expect(tenths(1)).toEqual({ key: 'timemachine.tenths.all' });
    expect(tenths(0.02).key).toBe('timemachine.tenths.few');
    expect(tenths(0.98).key).toBe('timemachine.tenths.many');
    expect(tenths(0.34)).toEqual({ key: 'timemachine.tenths.n', n: 3 });
  });

  it('has readable text that never tells the student what to buy', () => {
    for (const r of rules) {
      const text = t(r.textKey, { loss: 'about 2 in 10' });
      expect(text, `missing string for ${r.id}`).not.toBe(r.textKey);
      expect(text, `${r.id}: unfilled braces`).not.toMatch(/[{}]/);
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        expect(sentence.split(/\s+/).length, `${r.id}: sentence too long`).toBeLessThanOrEqual(30);
      }
      expect(text, `${r.id}: advice words`).not.toMatch(/\b(should|must|best|buy|recommend)\b/i);
    }
  });
});

describe('goals', () => {
  it('are well formed, with strings', () => {
    for (const g of goals) {
      expect(t(g.nameKey)).not.toBe(g.nameKey);
      expect(g.years).toBeGreaterThanOrEqual(1);
      expect(g.years).toBeLessThanOrEqual(20);
      expect(g.target).toBeGreaterThan(g.initial);
    }
  });
});

describe('runTimeMachine', () => {
  const params = { years: 10, initial: 10000, monthly: 2000, mix: defaultMix, target: 400000 };

  it('is repeatable and gives ordered bands', () => {
    const a = runTimeMachine(params);
    const b = runTimeMachine(params);
    expect(a.futures.summary).toEqual(b.futures.summary);
    const s = a.futures.summary;
    expect(s.p5).toBeLessThanOrEqual(s.median);
    expect(s.median).toBeLessThanOrEqual(s.p95);
    expect(s.invested).toBe(10000 + 2000 * 120);
  });

  it('reports a goal chance between 0 and 1 that rises as the goal gets easier', () => {
    const hard = runTimeMachine({ ...params, target: 900000 }).facts.goalChance;
    const easy = runTimeMachine({ ...params, target: 150000 }).facts.goalChance;
    expect(hard).toBeGreaterThanOrEqual(0);
    expect(easy).toBeLessThanOrEqual(1);
    expect(easy).toBeGreaterThan(hard);
  });

  it('a short, bumpy plan can lose money in the bad case, a steady one rarely does', () => {
    const bumpy = runTimeMachine({ ...params, years: 2, mix: { steady_box: 0, mixed_basket: 0, bumpy_ride: 100 } });
    const steady = runTimeMachine({ ...params, years: 2, mix: { steady_box: 100, mixed_basket: 0, bumpy_ride: 0 } });
    expect(bumpy.facts.lossChance).toBeGreaterThan(steady.facts.lossChance);
  });
});

describe('typicalYear', () => {
  it('is a wider range for a bumpier path, and the steady path stays above the starting amount', () => {
    const steady = typicalYear('steady_box');
    const bumpy = typicalYear('bumpy_ride');
    expect(steady.high - steady.low).toBeLessThan(bumpy.high - bumpy.low);
    expect(steady.low).toBeGreaterThan(10000);
    expect(bumpy.low).toBeLessThan(10000);
  });
});

describe('telemetry', () => {
  it('records a choice the event validator accepts', () => {
    const event = { eid: 'e1', pid: 'p1', class: null, mode: 'arcade', activity: 'time_machine', concept: 'time_horizon', choice: timeMachineChoice(10, defaultMix), correct: null, misconception: null, level: 2, stage: null, lifeStage: null, timeline: 'main', ts: 1, v: 1 };
    const r = validateEvent(event);
    if (!r.ok) throw new Error(r.errors.join(', '));
    expect(r.ok).toBe(true);
  });
});
