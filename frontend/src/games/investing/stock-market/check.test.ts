import { describe, it, expect } from 'vitest';
import raw from '@/content/scenarios/invest/stock_market.json';
import { fillTemplate, runCalcs } from '@/games/investing/lessons/logic/calc';
import { knownConcepts, knownMisconceptions, strings } from '@/games/investing/lessons/logic/content';
import { checkNumberAnswer, expectedDisplay } from '@/games/investing/lessons/logic/room';
import { t } from '@/platform';
import type { MarketConfig } from './logic/types';

const { check } = raw as unknown as MarketConfig;
const ctx = runCalcs(check.vars, check.calcs);
const MAX_SENTENCE_WORDS = 22;

const sentences = (s: string) => s.replace(/\*\*/g, '').split(/(?<=[.!?])\s+/).filter(Boolean);
const text = (key: string) => fillTemplate(t(key), ctx);

describe('stock market check questions', () => {
  it('has at least one number and one choice question, with unique ids', () => {
    expect(check.questions.some((q) => q.kind === 'number')).toBe(true);
    expect(check.questions.some((q) => q.kind === 'choice')).toBe(true);
    expect(new Set(check.questions.map((q) => q.id)).size).toBe(check.questions.length);
  });

  it.each(check.questions.map((q) => [q.id, q] as const))('%s is well formed and readable', (_id, q) => {
    expect(knownConcepts.has(q.concept), `unknown concept ${q.concept}`).toBe(true);
    const keys = [q.promptKey, q.explainKey, ...(q.hintKey ? [q.hintKey] : [])];
    for (const o of q.options ?? []) keys.push(o.textKey, ...(o.feedbackKey ? [o.feedbackKey] : []));
    for (const key of keys) {
      const out = text(key);
      expect(out, `${key}: missing string or unfilled braces`).not.toMatch(/[{}]|^stockmarket\./);
      for (const sentence of sentences(out)) {
        expect(sentence.split(/\s+/).length, `${key}: sentence too long: "${sentence}"`).toBeLessThanOrEqual(MAX_SENTENCE_WORDS);
      }
    }
    if (q.kind === 'number') {
      expect(q.hintKey, 'number questions need a hint').toBeTruthy();
      const c = ctx[q.answer!]!;
      const shown = expectedDisplay(c.raw, q.unit);
      expect(checkNumberAnswer(String(Math.round(shown * 100) / 100), c.raw, q.unit, q.tolerance)).toBe('correct');
      expect(checkNumberAnswer(String(shown + 7), c.raw, q.unit, q.tolerance)).toBe('wrong');
    } else {
      const opts = q.options ?? [];
      expect(opts.length).toBeGreaterThanOrEqual(3);
      expect(opts.length).toBeLessThanOrEqual(4);
      expect(opts.map((o) => o.id)).toContain(q.correct);
      for (const o of opts) {
        if (o.misconception) {
          expect(o.feedbackKey, `${o.id}: a named trap needs feedbackKey`).toBeTruthy();
          expect(knownMisconceptions.has(o.misconception), `unknown misconception ${o.misconception}`).toBe(true);
        }
      }
    }
  });

  it('the profit question counts price gain, dividends and the fee', () => {
    expect(ctx.profit!.raw).toBeCloseTo(10 * 12 + 10 * 2 - 5);
  });

  it('does not reuse lesson string keys by accident', () => {
    for (const key of Object.keys(strings)) expect(key.startsWith('stockmarket.')).toBe(false);
  });
});
