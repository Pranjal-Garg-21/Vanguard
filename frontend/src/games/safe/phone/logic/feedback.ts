/**
 * Feedback for a student's answer: correct or not, why, and whether a better
 * option existed. Pure. Owner: P5.
 */
import type { Surface, Verdict } from './types';

export type Grade = 'exact' | 'safe' | 'wrong';

export type Feedback = {
  grade: Grade;
  /** The most accurate or most useful answer, when it differs from the student's. */
  best: string | null;
  /** i18n key for the justification of the grade. */
  noteKey: string | null;
  /** i18n key for why the item is what it is. */
  explainKey: string | null;
};

/** Judge verbs: exact label, safe but not the best label, or wrong. */
export function judgeFeedback(surface: Surface, said: Verdict): Feedback {
  const truth = surface.verdict as Verdict;
  const explainKey = surface.explainKey ?? null;
  if (said === truth) return { grade: 'exact', best: null, noteKey: null, explainKey };
  if (truth === 'legit') return { grade: 'wrong', best: truth, noteKey: 'safe.fb.judge.false_alarm', explainKey };
  if (said === 'legit') return { grade: 'wrong', best: truth, noteKey: 'safe.fb.judge.unsafe', explainKey };
  // Scam vs suspicious: either keeps the student safe, one is more accurate.
  return { grade: 'safe', best: truth, noteKey: `safe.fb.judge.${truth}_${said}`, explainKey };
}

export type ResponseGrade = 'best' | 'ok' | 'wrong' | 'info';

export type ResponseFeedback = { grade: ResponseGrade; best: string | null; noteKey: string; explainKey: string | null };

const BEST: Record<'scam' | 'genuine', string> = { scam: 'block', genuine: 'open' };

/** Inbox responses: the best action, other safe actions, or a mistake. */
export function responseFeedback(surface: Surface, actionId: string): ResponseFeedback | null {
  const action = surface.actions?.find((a) => a.id === actionId);
  if (!action || (!surface.respond && surface.best === undefined)) return null;
  const kind = surface.genuine ? 'genuine' : 'scam';
  const best = surface.best ?? BEST[kind];
  // Neutral steps (a verification, a question) only get a card when they are the best move or carry a note.
  if (action.risk === 'neutral' && actionId !== best && !action.noteKey) return null;
  // A neutral step that is not the best move is a coaching note, not a grade.
  const grade: ResponseGrade = action.risk === 'risky' ? 'wrong' : actionId === best ? 'best' : action.risk === 'neutral' ? 'info' : 'ok';
  return { grade, best: grade === 'best' || grade === 'info' ? null : best, noteKey: action.noteKey ?? `safe.fb.inbox.${kind}.${actionId}`, explainKey: surface.explainKey ?? null };
}
