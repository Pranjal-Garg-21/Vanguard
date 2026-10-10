/**
 * Recovery-chance model. Pure. Owner: P3.
 *
 * Exported so the numbers can be argued about in review and tested without
 * rendering, rather than being buried in a component.
 */

import content from '@/content/scenarios/protect/rescue-mission.json';

export type RecoveryModel = typeof content.recovery;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Accuracy dominates (0.5) over speed (0.3): knowing the right order matters
 * more than being quick, and a student who thinks carefully should not be
 * punished for it. The floor is non-zero because reporting late still helps —
 * that is exactly the `too_late_to_report` misconception.
 */
export function recoveryChance(
  accuracy: number,
  elapsedMs: number,
  model: RecoveryModel = content.recovery,
): number {
  const seconds = elapsedMs / 1000;
  const span = model.slowSeconds - model.fastSeconds;
  const speed = span <= 0 ? 1 : clamp01((model.slowSeconds - seconds) / span);
  return clamp01(
    model.baseChance + model.accuracyWeight * clamp01(accuracy) + model.speedWeight * speed,
  );
}
