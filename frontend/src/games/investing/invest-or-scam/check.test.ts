import { describe, it, expect } from 'vitest';
import raw from '@/content/scenarios/invest/invest_or_scam.json';
import { knownMisconceptions } from '@/games/investing/lessons/logic/content';
import { t } from '@/platform';
import { describeCheck } from '@/test/describeCheck';
import { isCorrect, misconceptionFor, order, summarise, type ScamCard, type ScamConfig } from './logic/sort';

const config = raw as unknown as ScamConfig & { check: Parameters<typeof describeCheck>[2] };
describeCheck('invest or scam', 'scamsort', config.check);

const words = (s: string) => s.trim().split(/\s+/).length;
const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).filter(Boolean);

describe('the twelve offers', () => {
  it('has 12 cards with every bucket represented, and unique ids', () => {
    expect(config.cards).toHaveLength(12);
    expect(new Set(config.cards.map((c) => c.id)).size).toBe(12);
    for (const b of config.buckets) expect(config.cards.filter((c) => c.answer === b).length, `bucket ${b}`).toBeGreaterThanOrEqual(3);
  });

  it('every card has a text, an explanation, and tells that exist', () => {
    for (const c of config.cards) {
      expect(t(`scamsort.card.${c.id}.text`), c.id).not.toBe(`scamsort.card.${c.id}.text`);
      expect(t(`scamsort.card.${c.id}.why`), c.id).not.toBe(`scamsort.card.${c.id}.why`);
      expect(c.tells.length).toBeGreaterThanOrEqual(1);
      for (const tell of c.tells) {
        expect(config.tellKinds[tell], `${c.id}: unknown tell ${tell}`).toBeTruthy();
        expect(t(`scamsort.tell.${tell}`)).not.toBe(`scamsort.tell.${tell}`);
      }
    }
  });

  it('red flags only on scams and gambling, good signs on investing: the signs agree with the answer', () => {
    for (const c of config.cards) {
      const kinds = c.tells.map((x) => config.tellKinds[x]);
      if (c.answer === 'investing') expect(kinds.every((k) => k === 'good'), `${c.id} investing should show good signs only`).toBe(true);
      else expect(kinds.every((k) => k === 'flag'), `${c.id} should show red flags only`).toBe(true);
    }
  });

  it('is readable: short sentences', () => {
    for (const c of config.cards) {
      for (const key of [`scamsort.card.${c.id}.text`, `scamsort.card.${c.id}.why`]) {
        for (const s of sentences(t(key))) expect(words(s), `${key}: "${s}"`).toBeLessThanOrEqual(26);
      }
    }
  });

  it('every trap names a known misconception', () => {
    for (const c of config.cards) if (c.trap) expect(knownMisconceptions.has(c.trap), c.trap).toBe(true);
  });

  it('the hyped coin is explained as speculation, not as a sure scam', () => {
    const coin = config.cards.find((c) => c.trap === 'speculation_is_investing')!;
    expect(coin.answer).toBe('gambling');
    expect(t(`scamsort.card.${coin.id}.why`).toLowerCase()).toContain('speculation');
    expect(t(`scamsort.card.${coin.id}.why`).toLowerCase()).toContain('not always a scam');
  });

  it('no card names a real brand (the global word-list test also scans this file)', () => {
    for (const c of config.cards) expect(t(`scamsort.card.${c.id}.text`)).not.toMatch(/zerodha|groww|paytm|bitcoin|nifty|sensex/i);
  });
});

describe('scoring', () => {
  const card = (id: string) => config.cards.find((c) => c.id === id) as ScamCard;

  it('checks the answer and names the misconception only for the classic wrong "investing"', () => {
    expect(isCorrect(card('s3'), 'scam')).toBe(true);
    expect(misconceptionFor(card('s3'), 'investing')).toBe('guaranteed_returns_exist');
    expect(misconceptionFor(card('s3'), 'gambling')).toBeUndefined();
    expect(misconceptionFor(card('s3'), 'scam')).toBeUndefined();
    expect(misconceptionFor(card('s2'), 'gambling')).toBeUndefined();
  });

  it('sums right and wrong by bucket and lists the red flags you missed', () => {
    const all = Object.fromEntries(config.cards.map((c) => [c.id, c.answer]));
    expect(summarise(config, all)).toMatchObject({ correct: 12, total: 12, missedFlags: [] });
    const wrong = { ...all, s3: 'investing' as const, s4: 'investing' as const, s6: 'investing' as const };
    const s = summarise(config, wrong);
    expect(s.correct).toBe(9);
    expect(s.byBucket.scam).toEqual({ correct: 2, total: 5 });
    expect(s.missedFlags).toEqual(expect.arrayContaining(['guarantee', 'urgency', 'secrecy', 'recruiting']));
    expect(summarise(config, {}).correct).toBe(0);
  });

  it('orders cards the same way for the same seed and differently for another', () => {
    const ids = config.cards.map((c) => c.id);
    expect(order(ids, 'a')).toEqual(order(ids, 'a'));
    expect(order(ids, 'a')).not.toEqual(order(ids, 'b'));
    expect([...order(ids, 'a')].sort()).toEqual([...ids].sort());
  });
});
