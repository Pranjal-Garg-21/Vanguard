/**
 * Scam Duels: turn-based battles against scammers.
 *
 * The scammer has one "pressure" point per tactic. Each turn they use their
 * current tactic and you answer:
 *   counter → you spot the tell: their pressure drops and they move on;
 *   dodge   → not wrong, not right: they press harder (you lose 1 shield);
 *   fall    → you give them what they want (you lose 2 shields).
 * Win by countering every tactic. Lose when your shields run out.
 * Pure: the UI renders the state and feeds in choices.
 */
import duelsJson from '@/content/paisapur/duels.json';

export type Effect = 'counter' | 'dodge' | 'fall';
export type DuelOption = { id: string; effect: Effect };
export type DuelRound = { tactic: string; options: DuelOption[] };
export type DuelDef = {
  id: string;
  foe: string;
  concept: string;
  /** Money at stake if you lose (the script decides what losing costs). */
  stake: number;
  rounds: DuelRound[];
};

export const DUELS: DuelDef[] = duelsJson.duels as DuelDef[];

export const SHIELDS = 3;

export function duelById(id: string): DuelDef {
  const d = DUELS.find((x) => x.id === id);
  if (!d) throw new Error(`unknown duel ${id}`);
  return d;
}

export type DuelState = {
  id: string;
  round: number;
  pressure: number;
  shields: number;
  outcome: 'on' | 'win' | 'lose';
  /** The last answer, for the reply text. */
  last?: { option: string; effect: Effect; tactic: string };
  /** Tells you spotted, in order (tactic IDs). */
  spotted: string[];
};

export function startDuel(id: string): DuelState {
  const d = duelById(id);
  return { id, round: 0, pressure: d.rounds.length, shields: SHIELDS, outcome: 'on', spotted: [] };
}

export function currentRound(s: DuelState): DuelRound {
  const d = duelById(s.id);
  return d.rounds[Math.min(s.round, d.rounds.length - 1)]!;
}

export function answer(s: DuelState, optionId: string): DuelState {
  if (s.outcome !== 'on') return s;
  const round = currentRound(s);
  const opt = round.options.find((o) => o.id === optionId);
  if (!opt) return s;
  const last = { option: opt.id, effect: opt.effect, tactic: round.tactic };
  if (opt.effect === 'counter') {
    const pressure = s.pressure - 1;
    return {
      ...s,
      round: s.round + 1,
      pressure,
      last,
      spotted: [...s.spotted, round.tactic],
      outcome: pressure <= 0 ? 'win' : 'on',
    };
  }
  const shields = Math.max(0, s.shields - (opt.effect === 'fall' ? 2 : 1));
  return { ...s, shields, last, outcome: shields <= 0 ? 'lose' : 'on' };
}
