/**
 * Shared game contracts. Owner: P2.
 *
 * PLACEHOLDER from Implementation.md §6.4 so everyone can build against the
 * MiniGame contract on day one. P2 replaces GameState, Persona and EffectMap
 * with the real shapes; keep the exported names stable.
 */

export type ConceptId = string;
export type MisconceptionId = string;

export type Verb =
  | 'choose'
  | 'allocate'
  | 'commit'
  | 'triage'
  | 'rank'
  | 'predict'
  | 'judge'
  | 'act-in-situ';

export type Level = 1 | 2 | 3;

export type PlayMode = 'lifepath' | 'arcade' | 'quickplay' | 'daily';

/** TODO(P1): real persona shape. */
export type Persona = Record<string, unknown>;

/** TODO(P2): real game state (money, meters, meta, learn, ledger). */
export type GameState = Record<string, unknown>;

/** Effect paths such as "money.savingsJars.emergency" → amount. */
export type EffectMap = Record<string, number>;

export type MiniGameContext = {
  persona: Persona;
  level: Level;
  /** So a replay is identical. */
  seed: number;
  stateSlice: Partial<GameState>;
  mode: PlayMode;
};

export type MiniGameChoice = {
  stepId: string;
  choiceId: string;
  correct?: boolean;
  ms: number;
  /** Optional: the concept this choice tests, when a game covers several. */
  concept?: ConceptId;
  /** Optional: the misconception a wrong choice reveals. */
  misconception?: MisconceptionId;
};

export type MiniGameResult = {
  choices: MiniGameChoice[];
  conceptDeltas: Record<ConceptId, number>;
  misconceptions: MisconceptionId[];
  /** Applied to GameState only in 'lifepath' mode. */
  effects?: EffectMap;
  /** Shown on the RESULT step. */
  summaryKey: string;
};

export interface MiniGame {
  id: string;
  verbs: Verb[];
  concepts: ConceptId[];
  levels: Level[];
  /** Renders inside the runtime's PLAY step. */
  play(ctx: MiniGameContext): Promise<MiniGameResult>;
}
