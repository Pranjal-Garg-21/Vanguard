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

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

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
