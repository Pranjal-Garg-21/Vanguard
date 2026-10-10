/**
 * Kabir's parallel life. He lives the same year as the player, with the same
 * world seed (same market, same luck), the same goal and the same chapter
 * calendar, but he always takes the tempting choice: spend now, borrow fast,
 * follow tips, join the scheme. His life is re-simulated from scratch by the
 * real engine whenever it's needed, so it is always consistent and costs
 * nothing to store. Pure.
 */
import { GOAL_DEFS, monthlyNeeds, newLife, reduce, type Action, type LifeState } from '@/core/engine';

export type RivalBeat =
  | 'sneakers'
  | 'goal_now'
  | 'crack_loanapp'
  | 'moneylender'
  | 'tips'
  | 'ponzi';

export type RivalLife = {
  state: LifeState;
  /** What Kabir did, month by month (for dialogue and the comparison panel). */
  beats: { month: number; beat: RivalBeat }[];
};

const apply = (s: LifeState, ...actions: Action[]) => actions.reduce(reduce, s);

/** Simulates Kabir up to the player's current month. */
export function simulateKabir(player: LifeState): RivalLife {
  const cm = player.chapterMonths ?? {};
  const startOf = (ch: number) => cm[ch];
  const goal = GOAL_DEFS[player.goal.id] ? player.goal.id : 'phone';
  let s = apply(newLife(player.seed), { type: 'setup', look: 'player_a', lifeStage: player.lifeStage, source: 'allowance', goal });
  s = apply(s, { type: 'gain', amount: 1000, reason: 'gift' });
  const beats: RivalLife['beats'] = [];

  for (let m = 0; m <= player.month; m++) {
    // Chapter events happen in the same month as they did for the player.
    if (startOf(1) === m) s = apply(s, { type: 'openAccount' }, { type: 'enableUpi' }, { type: 'deposit', amount: Math.max(0, s.cash - 200) });
    if (startOf(2) === m) {
      s = apply(s, { type: 'buy', item: 'sneakers', from: s.bank.balance >= s.cash ? 'bank' : 'cash' });
      beats.push({ month: m, beat: 'sneakers' });
      // He wants his goal NOW: on a credit card if it's small, or with a loan app.
      const target = GOAL_DEFS[goal].target;
      if (target <= 10000) s = apply(s, { type: 'buyGoal', onCard: true });
      else {
        // (The loan app keeps a 20% fee, so he borrows more to end up with enough.)
        s = apply(s, { type: 'takeLoan', kind: 'loanapp', amount: Math.ceil(target / 0.8), months: 3 }, { type: 'buyGoal' });
      }
      beats.push({ month: m, beat: 'goal_now' });
    }
    if (startOf(3) === m) {
      // Same cracked phone as the player, but no emergency fund: a loan app pays for it.
      s = apply(s, { type: 'takeLoan', kind: 'loanapp', amount: 5000, months: 3 }, { type: 'spend', amount: 1500, reason: 'repair:phone', from: 'bank' });
      beats.push({ month: m, beat: 'crack_loanapp' });
    }
    if (startOf(4) === m) {
      // Borrows from the moneylender to pay off the app.
      s = apply(s, { type: 'takeLoan', kind: 'moneylender', amount: 5000, months: 12 });
      beats.push({ month: m, beat: 'moneylender' });
    }
    if (startOf(5) === m) {
      // A chat-group tip: everything into Gully Gadgets.
      if (s.bank.balance >= 100) s = apply(s, { type: 'buyAsset', asset: 'gully', amount: s.bank.balance });
      beats.push({ month: m, beat: 'tips' });
    }
    if (startOf(6) === m) {
      const stake = Math.min(2000, s.bank.balance + s.cash);
      if (stake > 0) s = apply(s, { type: 'scamLoss', amount: stake, reason: 'ponzi:dhamaka' });
      beats.push({ month: m, beat: 'ponzi' });
    }

    if (m === player.month) break;

    // Everyday Kabir: buys his needs, then spends most of what's left on wants.
    for (const item of monthlyNeeds(s)) s = apply(s, { type: 'buy', item: item.id, from: s.bank.upi ? 'bank' : 'cash' });
    const spare = Math.floor((s.bank.balance + s.cash) * 0.6);
    if (spare > 0) s = apply(s, { type: 'spend', amount: Math.min(spare, s.bank.balance), reason: 'buy:wants', from: 'bank' });
    s = apply(s, { type: 'advanceMonth' });
  }
  return { state: s, beats };
}
