/**
 * Answer checking for TryHackMe-style rooms. Pure logic, no React.
 *
 * Students type numbers in many shapes: "150", "₹150", "1,00,000", "-50", "₹-50", "20%", "60 %".
 * We accept all of those and compare to the expected value with a small tolerance.
 */
import type { Room, RoomQuestion } from './types';

/** Turns what the student typed into a number, or null if it is not a number. */
export function parseAnswer(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/[₹,\s%]/g, '')
    .replace(/^rs\.?/i, '')
    .replace(/[−–]/g, '-'); // typographic minus signs
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  return Number(cleaned);
}

export type AnswerResult = 'correct' | 'wrong' | 'invalid';

/** What the student should type: percent answers are typed as 60, not 0.6. */
export function expectedDisplay(raw: number, unit: RoomQuestion['unit']): number {
  return unit === 'percent' ? raw * 100 : raw;
}

export function checkNumberAnswer(input: string, raw: number, unit: RoomQuestion['unit'], tolerance = 0.5): AnswerResult {
  const typed = parseAnswer(input);
  if (typed === null) return 'invalid';
  return Math.abs(typed - expectedDisplay(raw, unit)) <= tolerance ? 'correct' : 'wrong';
}

export function roomPoints(room: Room): number {
  return room.tasks.flatMap((t) => t.questions).reduce((sum, q) => sum + q.points, 0);
}

export function roomQuestions(room: Room): RoomQuestion[] {
  return room.tasks.flatMap((t) => t.questions);
}

/** What we remember about one question while a student works through a room. */
export interface QuestionState {
  solved: boolean;
  /** The student asked to see the answer: no points. */
  revealed: boolean;
  wrong: number;
  hintShown: boolean;
  invalid: boolean;
  /** Feedback key of the last wrong option picked (choice questions). */
  lastFeedbackKey?: string;
  wrongOptions: string[];
}

export const emptyQuestionState = (): QuestionState => ({
  solved: false,
  revealed: false,
  wrong: 0,
  hintShown: false,
  invalid: false,
  wrongOptions: [],
});

// ---------------------------------------------------------------------------
// Saving and summarising progress
// ---------------------------------------------------------------------------

export type ProgressMap = Record<string, QuestionState>;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const touched = (s: QuestionState) => s.solved || s.revealed || s.wrong > 0 || s.hintShown;

/** What to store: only this room's questions, and only the ones the student has touched. */
export function serializeProgress(answers: ProgressMap, room: Room): ProgressMap {
  const known = new Set(roomQuestions(room).map((q) => q.id));
  const out: ProgressMap = {};
  for (const [id, state] of Object.entries(answers)) {
    if (known.has(id) && touched(state)) out[id] = state;
  }
  return out;
}

/** Reads saved data back. Never trusts it: unknown questions and odd values are dropped or reset to safe defaults. */
export function parseProgress(raw: unknown, room: Room): ProgressMap {
  if (!isRecord(raw)) return {};
  const known = new Set(roomQuestions(room).map((q) => q.id));
  const out: ProgressMap = {};
  for (const [id, v] of Object.entries(raw)) {
    if (!known.has(id) || !isRecord(v)) continue;
    const wrong = typeof v.wrong === 'number' && Number.isFinite(v.wrong) ? Math.max(0, Math.floor(v.wrong)) : 0;
    const state: QuestionState = {
      solved: v.solved === true,
      revealed: v.revealed === true,
      wrong,
      hintShown: v.hintShown === true,
      invalid: false,
      wrongOptions: Array.isArray(v.wrongOptions) ? v.wrongOptions.filter((o): o is string => typeof o === 'string') : [],
      ...(typeof v.lastFeedbackKey === 'string' ? { lastFeedbackKey: v.lastFeedbackKey } : {}),
    };
    if (touched(state)) out[id] = state;
  }
  return out;
}

export interface RoomSummary {
  tasksDone: number;
  tasksTotal: number;
  earned: number;
  total: number;
  status: 'new' | 'started' | 'done';
}

/** Where a student stands in a room: used by the room header and the lesson list. */
export function summariseProgress(room: Room, answers: ProgressMap): RoomSummary {
  const state = (id: string) => answers[id];
  const isDone = (q: RoomQuestion) => Boolean(state(q.id)?.solved || state(q.id)?.revealed);
  const tasksDone = room.tasks.filter((t) => t.questions.every(isDone)).length;
  const earned = roomQuestions(room).reduce((sum, q) => sum + (state(q.id)?.solved && !state(q.id)?.revealed ? q.points : 0), 0);
  const any = roomQuestions(room).some((q) => Boolean(state(q.id) && touched(state(q.id)!)));
  return {
    tasksDone,
    tasksTotal: room.tasks.length,
    earned,
    total: roomPoints(room),
    status: tasksDone === room.tasks.length ? 'done' : any ? 'started' : 'new',
  };
}

export const progressSlot = (roomId: string) => `invest:${roomId}`;
