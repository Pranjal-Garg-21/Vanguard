/**
 * Shuffles the order of the options on every screen, so the right answer is
 * not always in the same place. Same seed, same order, so a replay matches.
 * Pure. Owner: P5.
 */
import { makeRng } from './rng';
import type { Scenario } from './types';

const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

export function shuffleChoices(script: Scenario, seed: number): Scenario {
  const copy = JSON.parse(JSON.stringify(script)) as Scenario;
  for (const step of copy.steps) {
    const actions = step.surface.actions;
    if (!actions || actions.length < 2) continue;
    step.surface.actions = makeRng((seed * 31 + hash(step.id)) >>> 0).shuffle(actions);
  }
  return copy;
}
