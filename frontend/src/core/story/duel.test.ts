import { describe, expect, it } from 'vitest';
import { answer, currentRound, DUELS, startDuel, type DuelState } from './duel';

const pickEffect = (s: DuelState, effect: string) => answer(s, currentRound(s).options.find((o) => o.effect === effect)!.id);

describe('scam duels', () => {
  it('are won by countering every tactic', () => {
    for (const d of DUELS) {
      let s = startDuel(d.id);
      for (let i = 0; i < d.rounds.length; i++) s = pickEffect(s, 'counter');
      expect(s.outcome, d.id).toBe('win');
      expect(s.spotted).toEqual(d.rounds.map((r) => r.tactic));
    }
  });

  it('a dodge costs one shield and repeats the tactic', () => {
    const s0 = startDuel('kyc_sms');
    const s1 = pickEffect(s0, 'dodge');
    expect(s1.shields).toBe(s0.shields - 1);
    expect(currentRound(s1).tactic).toBe(currentRound(s0).tactic);
  });

  it('falling for it twice loses the duel', () => {
    let s = startDuel('jackpot');
    s = pickEffect(s, 'fall');
    expect(s.outcome).toBe('on');
    s = pickEffect(s, 'fall');
    expect(s.outcome).toBe('lose');
    expect(answer(s, 'a')).toBe(s);
  });
});
