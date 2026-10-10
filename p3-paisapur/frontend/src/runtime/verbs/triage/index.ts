/**
 * Verb component: triage. Returns MiniGameResult choices.
 * Owner: P3
 *
 * Tap-to-move, not drag: tap an item, tap a bucket. Every target is a real
 * <button>, so keyboard support comes for free.
 *
 *   layout="queue"  one card at a time   (UC-PB-01 Swipe Sort)
 *   layout="board"  all items visible    (UC-BANK-01 Document Hunt)
 */
export { Triage } from './Triage';
export type { TriageProps } from './Triage';
export {
  selectCards,
  expectedBucket,
  explanationKey,
  type TriageBucket,
  type TriageCard,
  type QueueEntry,
  type SortRecord,
} from './logic/deck';
