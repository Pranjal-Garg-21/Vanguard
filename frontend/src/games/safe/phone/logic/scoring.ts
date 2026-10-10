/**
 * Turns a finished run into the MiniGameResult the runtime expects. Pure.
 * Owner: P5.
 */
import type { MiniGameChoice, MiniGameResult, PlayMode } from '@/core/types';
import { bankBalance, surfaceOf, tellReport } from './runner';
import type { RunState, TellKind, Verdict } from './types';

/**
 * A legit item must be called legit. A scam or suspicious item is handled
 * safely if the student is careful: "suspicious" and "scam" both count.
 */
export function judgedSafely(truth: Verdict, said: Verdict): boolean {
  return truth === 'legit' ? said === 'legit' : said !== 'legit';
}

export function scoreRun(state: RunState, mode: PlayMode): MiniGameResult {
  const { script } = state;
  const choices: MiniGameChoice[] = [];
  const misconceptions = new Set<string>();
  const perConcept = new Map<string, { good: number; total: number }>();
  const credit = (concept: string, good: boolean) => {
    const row = perConcept.get(concept) ?? { good: 0, total: 0 };
    perConcept.set(concept, { good: row.good + (good ? 1 : 0), total: row.total + 1 });
  };
  const conceptOf = (surfaceId: string) => surfaceOf(script, surfaceId)?.concept ?? script.concepts[0] ?? 'unknown';

  const startedAt = new Map<string, number>();
  for (const e of state.history) {
    if (e.kind === 'opened' && !startedAt.has(e.surface)) startedAt.set(e.surface, e.t);
  }
  const ms = (surface: string, t: number) => Math.max(0, t - (startedAt.get(surface) ?? t));

  for (const e of state.history) {
    const surface = surfaceOf(script, e.surface);
    if (!surface) continue;
    if (e.kind === 'judged' && surface.verdict) {
      const good = judgedSafely(surface.verdict, e.verdict);
      choices.push({ stepId: e.surface, choiceId: e.verdict, correct: good, ms: ms(e.surface, e.t), concept: conceptOf(e.surface), ...(!good && surface.misconception ? { misconception: surface.misconception } : {}) });
      credit(conceptOf(e.surface), good);
      if (!good && surface.misconception) misconceptions.add(surface.misconception);
    }
    if (e.kind === 'acted') {
      const action = surface.actions?.find((a) => a.id === e.action);
      if (!action) continue;
      const correct = action.risk === 'neutral' ? undefined : action.risk === 'safe';
      const why = action.misconception ?? surface.misconception;
      choices.push({ stepId: e.surface, choiceId: e.action, ...(correct === undefined ? {} : { correct }), ms: ms(e.surface, e.t), concept: conceptOf(e.surface), ...(action.risk === 'risky' && why ? { misconception: why } : {}) });
      if (correct !== undefined) credit(conceptOf(e.surface), correct);
      if (action.risk === 'risky') {
        const m = action.misconception ?? surface.misconception;
        if (m) misconceptions.add(m);
      }
    }
  }

  const conceptDeltas: Record<string, number> = {};
  for (const [concept, { good, total }] of perConcept) conceptDeltas[concept] = total === 0 ? 0 : good / total;

  const summaryKey =
    script.mode === 'judge' ? 'safe.summary.judge' : state.outcome === 'fooled' ? 'safe.summary.fooled' : 'safe.summary.safe';

  return {
    choices,
    conceptDeltas,
    misconceptions: [...misconceptions],
    // The simulation always shows money moving; real game state changes only in LifePath.
    ...(mode === 'lifepath' && Object.keys(state.effects).length > 0 ? { effects: { ...state.effects } } : {}),
    summaryKey,
  };
}

export type RunSummary = {
  outcome: RunState['outcome'];
  balanceLost: number;
  tellsFound: number;
  tellsTotal: number;
  judgedRight: number;
  judgedTotal: number;
  /** Inbox: responses that were safe, out of all responses. */
  handledSafely: number;
  handledTotal: number;
  /** Inbox: real messages the student blocked. */
  falseAlarms: number;
};

/** Numbers for the completion screen. */
export function summarise(state: RunState): RunSummary {
  let tellsFound = 0;
  let tellsTotal = 0;
  let judgedRight = 0;
  let judgedTotal = 0;
  let handledSafely = 0;
  let handledTotal = 0;
  let falseAlarms = 0;
  for (const step of state.script.steps) {
    const seen = state.inbox.includes(step.id);
    if (!seen) continue;
    const report = tellReport(state, step.id);
    tellsFound += report.found.length;
    tellsTotal += report.found.length + report.missed.length;
    if (step.surface.respond && state.acted[step.id]) {
      const risk = step.surface.actions?.find((a) => a.id === state.acted[step.id])?.risk;
      handledTotal += 1;
      if (risk === 'safe') handledSafely += 1;
      if (risk === 'risky' && step.surface.genuine) falseAlarms += 1;
    }
    const said = state.verdicts[step.id];
    if (step.surface.verdict && said) {
      judgedTotal += 1;
      if (judgedSafely(step.surface.verdict, said)) judgedRight += 1;
    }
  }
  return {
    outcome: state.outcome,
    balanceLost: state.script.phone.startBalance - bankBalance(state),
    tellsFound,
    tellsTotal,
    judgedRight,
    judgedTotal,
    handledSafely,
    handledTotal,
    falseAlarms,
  };
}

/** Red-flag kinds the student uncovered in this run (they become collectible cards). */
export function foundKinds(state: RunState): TellKind[] {
  const kinds = new Set<TellKind>();
  for (const step of state.script.steps) for (const t of tellReport(state, step.id).found) kinds.add(t.kind);
  return [...kinds];
}
