/**
 * Verb component: rank. Returns MiniGameResult choices.
 * Owner: P3
 *
 * Reordering is tap-to-move (▲ / ▼), and the feedback is the ₹ cost of the
 * student's order versus the best one (§10.2), not a right/wrong tick.
 */
export { Rank } from './Rank';
export type { RankProps } from './Rank';
export {
  bestOrder,
  countInversions,
  scoreOrder,
  type RankItem,
  type RankDetail,
  type RankDirection,
} from './logic/score';
