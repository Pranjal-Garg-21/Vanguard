/**
 * Shared helpers for the Everyday Money games. Owner: P3.
 */

import type { ConceptId, MiniGameContext, MiniGameResult, Verb, Level } from '@/core/types';
import type { RichEffectMap } from '@/runtime/verbs/types';

export type GameProps = {
  ctx: MiniGameContext;
  onComplete: (result: MiniGameResult) => void;
};

/**
 * A game as the UI needs it.
 *
 * TODO(P2): `MiniGame` in `@/core/types` declares `play(ctx): Promise<Result>`,
 * but §10.1 says the mini-game is "rendered by the game owner's component"
 * inside the runtime's PLAY step, and `games/example` already anticipates a
 * `<Name>.tsx` the runtime mounts. A promise-returning function and a React
 * component are not the same thing, and every game in the app hits this.
 *
 * These games therefore carry a `Component`. `play()` is implemented so the
 * registry's `MiniGame` contract still holds, but it rejects with an
 * instruction rather than pretending to run headlessly.
 */
export type UiMiniGame = {
  id: string;
  /** The use case this implements, e.g. "UC-BR-01". */
  useCase: string;
  verbs: Verb[];
  concepts: ConceptId[];
  levels: Level[];
  /** Rewind saves a snapshot before this activity (§6.3 `checkpoint`). */
  checkpoint?: boolean;
  Component: (props: GameProps) => React.JSX.Element | null;
  play(ctx: MiniGameContext): Promise<MiniGameResult>;
};

export function defineGame(
  game: Omit<UiMiniGame, 'play'>,
): UiMiniGame {
  return {
    ...game,
    play() {
      return Promise.reject(
        new Error(
          `${game.id}: render this game's Component inside the runtime's PLAY ` +
            `step and resolve on onComplete. It cannot be played headlessly.`,
        ),
      );
    },
  };
}

/** Merge the outcomes of several verbs into one MiniGameResult. */
export function combine(
  summaryKey: string,
  parts: {
    choices: MiniGameResult['choices'];
    conceptDeltas: Record<ConceptId, number>;
    misconceptions: string[];
    effects?: RichEffectMap;
  }[],
): MiniGameResult {
  const choices: MiniGameResult['choices'] = [];
  const conceptDeltas: Record<ConceptId, number> = {};
  const misconceptions: string[] = [];
  let effects: RichEffectMap | undefined;

  for (const part of parts) {
    choices.push(...part.choices);
    // Last value wins: conceptDeltas are mastery *targets*, not increments.
    Object.assign(conceptDeltas, part.conceptDeltas);
    misconceptions.push(...part.misconceptions);
    if (part.effects) effects = { ...(effects ?? {}), ...part.effects };
  }

  return {
    choices,
    conceptDeltas,
    misconceptions: [...new Set(misconceptions)],
    // See RichEffectMap: §6.3 effects carry object and boolean payloads that
    // core/types' EffectMap does not yet model.
    effects: effects as MiniGameResult['effects'],
    summaryKey,
  };
}

/**
 * Narrow a two-bucket list read from content JSON.
 *
 * Triage takes an explicit pair so content cannot accidentally declare three
 * buckets, but JSON infers a plain array. The validator already checks that
 * every `correctBucket` names a declared bucket.
 */
export const asBuckets = <T,>(value: readonly T[]): [T, T] => value as unknown as [T, T];

export type ContextFilter = {
  lifeStage?: string[];
  circumstance?: string[];
  moneyPersonality?: string[];
};

/** Content-level persona filtering, applied before a deck reaches a verb. */
export function matchesPersona(
  filter: ContextFilter | undefined,
  ctx: MiniGameContext,
): boolean {
  if (!filter) return true;
  const persona = ctx.persona as Record<string, unknown>;
  for (const [field, allowed] of Object.entries(filter)) {
    if (!allowed?.length) continue;
    if (!allowed.includes(String(persona[field]))) return false;
  }
  return true;
}
