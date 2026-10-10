/**
 * Investing, Gambling or Scam? (arcade, safety): sort 12 offers, see the signs, check what you learned.
 * Use case: UC-SAFE-09 · Owner: P4 · Route: /learn/invest/invest-or-scam
 *
 *   InvestOrScam.tsx   the screens (intro, one offer at a time, result + check)
 *   logic/sort.ts      scoring and ordering (pure, tested)
 *   content            content/scenarios/invest/invest_or_scam.json + content/i18n/en/scamsort.json
 *
 * Uses a local stand-in (three buttons) until P3's Triage verb lands. Not yet a registered MiniGame.
 */

export { InvestOrScam } from './InvestOrScam';
