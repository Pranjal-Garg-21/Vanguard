/**
 * Everything the app knows about markets, in one pure module: no React, no
 * storage, no network. Owner: P4.
 *
 * Two layers that do different jobs and are deliberately kept apart:
 *
 * - `deccan` is the fictional market Paisapur plays in. Prices are a pure
 *   function of (seed, asset, month), so a replay or a What-If branch sees
 *   exactly the same market.
 * - the rest is the investing lessons' library: assumption-driven returns,
 *   the financial maths, fund simulation and the Monte Carlo runner.
 */

export * from './deccan';
export * from './assumptions';
export * from './finance';
export * from './funds-sim';
export * from './format';
export * from './montecarlo';
export * from './regimes';
export * from './rng';
export * from './simulate';
