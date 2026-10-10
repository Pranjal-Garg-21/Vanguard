/**
 * Mutual Fund Challenge (arcade): units, NAV, SIP, fees and the ETF difference. Use case: UC-INV-08 · Owner: P4
 * Route: /learn/invest/mutual-fund
 *
 *   MutualFund.tsx          the four steps (learn, pick, plan, result)
 *   LearnStep / PickStep / PlanStep / Results / Charts   its parts
 *   logic/notes.ts          the "what happened" and "think about it" lines (pure, tested)
 *   engine                  core/market/funds-sim.ts (units, SIP, fee drag, 500 futures; pure, tested)
 *   content                 content/scenarios/invest/mutual_fund.json + content/i18n/en/mutualfund.json
 *                           and the funds' numbers in content/assumptions.json
 *
 * Not yet a registered MiniGame: that waits for P2's runner.
 */

export { MutualFund } from './MutualFund';
