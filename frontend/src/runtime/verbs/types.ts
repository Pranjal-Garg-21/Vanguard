/**
 * Shapes shared by the four verbs P3 owns. Owner: P3.
 *
 * The canonical game contract lives in `@/core/types` (P2). This file only adds
 * the verb-level pieces that contract does not describe.
 */

import type { ConceptId, MiniGameChoice, MiniGameContext, MisconceptionId } from '@/core/types';

/** Text is never hard-coded; content supplies keys and `t()` resolves them. */
export type Localised = {
  textKey: string;
  audioKey?: string;
  imageKey?: string;
};

/**
 * Effects as Implementation.md §6.3 actually writes them.
 *
 * TODO(P2): `EffectMap` in `@/core/types` is `Record<string, number>`, but §6.3
 * shows object payloads — `"money.debt.add": { amount, lender }` — and boolean
 * flags. Commit and the Debt Ladder both emit those. The reducer needs to
 * accept them, and `EffectMap` needs widening to match the spec it cites.
 */
export type RichEffectMap = Record<string, number | string | boolean | object>;

/**
 * Every verb takes this plus its own content props, and calls `onComplete`
 * exactly once.
 *
 * A verb never touches GameState. It reports what happened and the runtime
 * decides whether to apply it — that is what stops Arcade play from mutating
 * the LifePath character (§6.4).
 */
export type VerbCommonProps = {
  stepId: string;
  ctx: MiniGameContext;
  onComplete: (outcome: VerbOutcome) => void;
};

/**
 * A verb's contribution to the enclosing MiniGameResult. A game merges one or
 * more of these and adds its own `summaryKey`.
 */
export type VerbOutcome = {
  choices: MiniGameChoice[];
  conceptDeltas: Record<ConceptId, number>;
  misconceptions: MisconceptionId[];
  effects?: RichEffectMap;
  /** Verb-specific detail the game needs for its own result screen. */
  detail?: unknown;
};

/**
 * A recurring obligation the engine enforces each month (§6.1).
 *
 * TODO(P2): belongs in `@/core/types` with the rest of GameState. Defined here
 * so Commit could be built before that landed.
 */
export type Commitment = {
  id: string;
  kind: 'savings' | 'emi' | 'sip' | 'bill';
  labelKey: string;
  amount: number;
  /** Months remaining; `null` = open-ended until cancelled. */
  durationMonths: number | null;
  startMonth: number;
  /** Jar or account the money moves into, e.g. `savingsJars.future`. */
  destination?: string;
};

/** Mastery target applied when the student gets something wrong. */
export const WRONG_TARGET = 0.2;

/**
 * Narrow a concept map coming out of content JSON.
 *
 * TypeScript infers each JSON object literal separately, so a pool of cards
 * produces a union of shapes with optional `undefined` keys rather than a
 * Record<ConceptId, number>. The validator already guarantees every key is a
 * known concept and every value is between 0 and 1, so the cast is checked —
 * just not by the compiler.
 */
export const conceptMap = (value: unknown): Record<ConceptId, number> =>
  (value ?? {}) as Record<ConceptId, number>;

/** The same narrowing, for effect maps read out of content JSON. */
export const effectMap = (value: unknown): RichEffectMap =>
  (value ?? {}) as RichEffectMap;
