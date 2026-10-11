/**
 * Arcade: play any mini-game directly, outside the Paisapur story.
 * Owner: P4 (shell) · P3 (Everyday Money section)
 *
 * `Arcade` is the front door at /arcade: one tile per pillar, with Investing
 * locked until S3. Each tile opens that pillar's own section — `ArcadeRoute`
 * for Everyday Money, the Stay Safe hub, the investing lessons.
 *
 * `ArcadeHub` is the older village-styled menu, kept because the arcade
 * cabinet in Paisapur still opens that look. TODO(P4): pick one.
 */

export { Arcade } from './Arcade';
export { ArcadeHub } from './ArcadeHub';
export { EverydayArcade } from './EverydayArcade';
export { ArcadeRoute } from './ArcadeRoute';
export type { EverydayArcadeProps } from './EverydayArcade';
