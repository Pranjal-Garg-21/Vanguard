import { it, expect } from 'vitest';
import raw from '@/content/scenarios/invest/stock_market.json';
import { strings } from '@/games/investing/lessons/logic/content';
import { describeCheck } from '@/test/describeCheck';
import type { MarketConfig } from './logic/types';

const { check } = raw as unknown as MarketConfig;
const ctx = describeCheck('stock market', 'stockmarket', check);

it('the profit question counts price gain, dividends and the fee', () => {
  expect(ctx.profit!.raw).toBeCloseTo(10 * 12 + 10 * 2 - 5);
});

it('does not reuse lesson string keys by accident', () => {
  for (const key of Object.keys(strings)) expect(key.startsWith('stockmarket.')).toBe(false);
});
