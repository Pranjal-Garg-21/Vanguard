/**
 * What the Arcade needs from other owners, in one place so the stand-ins are easy to swap.
 * Stand-in: P2's LifePath does not report passed stages yet, and P5's facilitator unlocks are not synced yet.
 * Until they land nothing counts as passed, so Investing shows its lock reason (and an "Open anyway" button).
 */
import type { StageId } from '@/platform';

/** True once the student has passed the gate of this LifePath stage. TODO(P2): read from LifePath state. */
export function isStagePassed(stage: StageId): boolean {
  void stage;
  return false;
}

/** True when a facilitator has opened this Arcade section for the class. TODO(P5): read from synced class settings. */
export function facilitatorOpened(sectionId: string): boolean {
  void sectionId;
  return false;
}
