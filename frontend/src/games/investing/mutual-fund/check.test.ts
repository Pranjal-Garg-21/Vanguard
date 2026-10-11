import { it, expect } from 'vitest';
import raw from '@/content/scenarios/invest/mutual_fund.json';
import { assumptions } from '@/core/market';
import { describeCheck } from '@/test/describeCheck';
import { t } from '@/platform';

const content = raw as unknown as { check: Parameters<typeof describeCheck>[2]; plan: { lump: { min: number; max: number; default: number }; sip: { min: number; max: number; default: number }; years: { min: number; max: number; default: number } } };
const ctx = describeCheck('mutual fund', 'mutualfund', content.check);

it('the unit questions divide money by the price, and a lower price buys more', () => {
  expect(ctx.u1!.raw).toBeCloseTo(20);
  expect(ctx.u2!.raw).toBeCloseTo(25);
  expect(ctx.u2!.raw).toBeGreaterThan(ctx.u1!.raw);
});

it('the fee question uses the same maths as the lesson: a bigger yearly cost ends lower', () => {
  expect(ctx.gap!.raw).toBeGreaterThan(0);
  expect(ctx.gap!.raw).toBeCloseTo(50000 * (1.095 ** 10 - 1.08 ** 10), 0);
});

it('plan limits are sensible', () => {
  for (const p of [content.plan.lump, content.plan.sip]) {
    expect(p.min).toBeLessThanOrEqual(p.default);
    expect(p.default).toBeLessThanOrEqual(p.max);
  }
  expect(content.plan.years.max).toBeLessThanOrEqual(20);
});

it('every fund has a name, a description and a holdings line', () => {
  for (const [id, f] of Object.entries(assumptions.funds)) {
    expect(t(f.labelKey)).not.toBe(f.labelKey);
    expect(t(`mutualfund.fund.${id}.what`)).not.toBe(`mutualfund.fund.${id}.what`);
    expect(t(`mutualfund.fund.${id}.holds`)).not.toBe(`mutualfund.fund.${id}.holds`);
    expect(t(`mutualfund.style.${f.style}`)).not.toBe(`mutualfund.style.${f.style}`);
  }
});

it('no fund is called best, top or recommended in any fund text', () => {
  const words = /\b(best|top|recommended|winner|must buy)\b/i;
  for (const id of Object.keys(assumptions.funds)) {
    expect(t(`mutualfund.fund.${id}.what`)).not.toMatch(words);
    expect(t(`mutualfund.fund.${id}.holds`)).not.toMatch(words);
  }
});
