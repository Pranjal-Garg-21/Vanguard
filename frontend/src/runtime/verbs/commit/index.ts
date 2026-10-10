/**
 * Verb component: commit. Returns MiniGameResult choices.
 * Owner: P3
 *
 * Sets a recurring obligation that bites if income drops (§10.2), so it emits
 * a real Commitment for the engine rather than a number the student can ignore.
 */
export { Commit } from './Commit';
export type { CommitProps, CommitDetail } from './Commit';
export { monthsToReach, HEAVY_COMMITMENT_SHARE } from './logic/goal';
