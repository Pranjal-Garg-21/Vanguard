/**
 * Turning what a mini-game did into story money. Pure.
 *
 * Games describe their consequences as §6.3 effect paths ("money.bank",
 * "human.trust", "meta.goals.set" …). Inside Paisapur the engine owns the
 * money, so a script opts in (`apply: true`) and only the effects listed here
 * become engine actions. Everything else a game reports is ignored on purpose:
 * consequences that need the story's judgement (which loan, which payment) go
 * through the script's `on` branches instead.
 */
import type { Action } from '@/core/engine';

type Effects = Record<string, unknown>;

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function gameEffectsToActions(effects: Effects | undefined): Action[] {
  if (!effects) return [];
  const actions: Action[] = [];

  // Cash moved into the bank: a deposit (Bank Counter's first deposit).
  const toBank = num(effects['money.bank']);
  if (toBank > 0 && num(effects['money.cash']) <= -toBank + 0.5) actions.push({ type: 'deposit', amount: Math.round(toBank) });

  // How the player feels about it.
  const peace = num(effects['human.peaceOfMind']);
  const trust = num(effects['human.trust']);
  const safety = num(effects['human.safety']);
  if (peace || trust || safety) actions.push({ type: 'meter', peace, trust, safety });

  // A sharper goal and a monthly amount to reach it (Goal Builder).
  const goal = effects['meta.goals.set'] as { target?: unknown; monthly?: unknown } | undefined;
  if (goal) {
    if (num(goal.target) > 0) actions.push({ type: 'setGoalTarget', amount: num(goal.target) });
    if (num(goal.monthly) > 0) actions.push({ type: 'setAutoSave', amount: num(goal.monthly) });
  }
  return actions;
}
