import { describe, it, expect } from 'vitest';
import { parseScamSave } from '../invest-or-scam/logic/save';
import { parseMutualFundSave } from '../mutual-fund/logic/save';
import { parseStockSave } from '../stock-market/logic/save';
import { parseTimeMachineSave } from '../time-machine/logic/save';
import { gameSlot, parseGameSave } from './gameSave';

const trade = { round: 1, id: 'chaiwala', side: 'buy', qty: 10, price: 100, fee: 5 };
const portfolio = { cash: 9000, shares: { chaiwala: 10 }, fees: 5, dividends: 0, trades: [trade] };

describe('saved games: a good save comes back, a bad one is ignored', () => {
  it('stock market', () => {
    const good = { phase: 'play', round: 4, portfolio };
    expect(parseStockSave(good)).toEqual(good);
    expect(parseStockSave(null)).toBeNull();
    expect(parseStockSave({ ...good, round: 0 })).toBeNull();
    expect(parseStockSave({ ...good, round: 99 })).toBeNull();
    expect(parseStockSave({ ...good, phase: 'cheat' })).toBeNull();
    expect(parseStockSave({ ...good, portfolio: { ...portfolio, cash: -5 } })).toBeNull();
    expect(parseStockSave({ ...good, portfolio: { ...portfolio, shares: { not_a_company: 3 } } })).toBeNull();
    expect(parseStockSave({ ...good, portfolio: { ...portfolio, shares: { chaiwala: 2.5 } } })).toBeNull();
    expect(parseStockSave({ ...good, portfolio: { ...portfolio, trades: [{ ...trade, round: 9 }] } })).toBeNull(); // a trade from the future
    expect(parseStockSave({ ...good, portfolio: { ...portfolio, trades: [{ ...trade, side: 'steal' }] } })).toBeNull();
    expect(parseStockSave('text')).toBeNull();
  });

  it('time machine', () => {
    const good = { goalId: 'laptop', years: 2, initial: 10000, monthly: 2000, mix: { steady_box: 40, mixed_basket: 40, bumpy_ride: 20 } };
    expect(parseTimeMachineSave(good)).toEqual(good);
    expect(parseTimeMachineSave({ ...good, goalId: 'yacht' })).toBeNull();
    expect(parseTimeMachineSave({ ...good, years: 50 })).toBeNull();
    expect(parseTimeMachineSave({ ...good, mix: { steady_box: 50, mixed_basket: 50, bumpy_ride: 50 } })).toBeNull();
    expect(parseTimeMachineSave({ ...good, mix: { steady_box: 41, mixed_basket: 39, bumpy_ride: 20 } })).toBeNull();
    expect(parseTimeMachineSave({})).toBeNull();
  });

  it('mutual fund', () => {
    const good = { fundId: 'index_etf', plan: { method: 'sip', amount: 1000, years: 10 } };
    expect(parseMutualFundSave(good)).toEqual(good);
    expect(parseMutualFundSave({ ...good, fundId: 'unknown' })).toBeNull();
    expect(parseMutualFundSave({ ...good, plan: { method: 'sip', amount: 999999, years: 10 } })).toBeNull();
    expect(parseMutualFundSave({ ...good, plan: { method: 'weekly', amount: 1000, years: 10 } })).toBeNull();
    expect(parseMutualFundSave({ ...good, plan: { method: 'lump', amount: 50000, years: 1 } })).toBeNull();
  });

  it('invest or scam', () => {
    expect(parseScamSave({ correct: 9, total: 12 })).toEqual({ correct: 9, total: 12 });
    expect(parseScamSave({ correct: 13, total: 12 })).toBeNull();
    expect(parseScamSave({ correct: -1, total: 12 })).toBeNull();
    expect(parseScamSave([])).toBeNull();
  });

  it('the wrapper keeps "done" even when the state is junk', () => {
    expect(parseGameSave({ done: true, state: { nonsense: 1 } }, parseScamSave)).toEqual({ done: true, state: null });
    expect(parseGameSave({ done: true, state: { correct: 3, total: 12 } }, parseScamSave)).toEqual({ done: true, state: { correct: 3, total: 12 } });
    expect(parseGameSave(null, parseScamSave)).toEqual({ done: false, state: null });
    expect(parseGameSave('x', parseScamSave)).toEqual({ done: false, state: null });
  });

  it('slots do not clash with the rooms', () => {
    expect(gameSlot('stock-market')).not.toMatch(/^invest:/);
  });
});
