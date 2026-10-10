import { describe, expect, it } from 'vitest';
import { newLife, reduce, type Action, type LifeState } from '@/core/engine';
import { bagContents } from './bag';

const apply = (s: LifeState, ...a: Action[]) => a.reduce(reduce, s);
const fmt = (n: number) => `₹${Math.round(n)}`;

describe('bag', () => {
  it('starts with a wallet and an old phone', () => {
    const ids = bagContents(newLife(1), fmt).map((i) => i.id);
    expect(ids).toEqual(['wallet', 'phone']);
  });

  it('fills up as you live: card, UPI phone, kept things, receipts, papers', () => {
    let s = apply(newLife(1), { type: 'gain', amount: 5000, reason: 'gift' }, { type: 'openAccount' }, { type: 'enableUpi' }, { type: 'deposit', amount: 4000 });
    s = apply(s, { type: 'flag', name: 'has_docs' }, { type: 'buy', item: 'sneakers', from: 'bank' }, { type: 'buyBond', amount: 500 });
    const bag = bagContents(s, fmt);
    const ids = bag.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['documents', 'debit_card', 'phone_upi', 'thing_sneakers', 'receipt', 'bond']));
    expect(bag.find((i) => i.id === 'receipt')!.vars.item).toBe('sneakers');
  });

  it('things lose value over time (depreciation)', () => {
    let s = apply(newLife(1), { type: 'gain', amount: 3000, reason: 'gift' }, { type: 'buy', item: 'sneakers', from: 'cash' });
    s = { ...s, month: 12 };
    const sneakers = bagContents(s, fmt).find((i) => i.id === 'thing_sneakers')!;
    expect(Number(String(sneakers.vars.now).slice(1))).toBeLessThan(Number(String(sneakers.vars.price).slice(1)));
  });
});
