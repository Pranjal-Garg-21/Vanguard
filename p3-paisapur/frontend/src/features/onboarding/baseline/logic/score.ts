/**
 * Turns the baseline answers into a starting point. Pure: no React, storage
 * or network, so it is easy to test and safe to reuse in the engine.
 */
import type { BaselineQuestion } from '../questions';

export type BaselineAnswers = Record<string, string | string[]>;

export type BaselineLevel = 'starter' | 'builder' | 'navigator';

export type BaselineResult = {
  version: 1;
  completedAt: number;
  level: BaselineLevel;
  knowledge: {
    correct: number;
    total: number;
    /** concept → true (right), false (wrong or not sure). */
    byConcept: Record<string, boolean>;
    misconceptions: string[];
  };
  /** 1 (not comfortable) to 4 (very comfortable), or null if skipped. */
  confidence: 1 | 2 | 3 | 4 | null;
  experience: string[];
  moneySource: string | null;
  goal: string | null;
  focus: string | null;
  style: string | null;
};

function single(answers: BaselineAnswers, id: string): string | null {
  const value = answers[id];
  return typeof value === 'string' ? value : null;
}

/** 0–1 right → starter, 2–3 → builder, 4+ → navigator (of 5 questions). */
export function levelFor(correct: number, total: number): BaselineLevel {
  const share = total === 0 ? 0 : correct / total;
  if (share >= 0.8) return 'navigator';
  if (share >= 0.4) return 'builder';
  return 'starter';
}

export function scoreBaseline(
  answers: BaselineAnswers,
  questions: BaselineQuestion[],
  now: number = Date.now(),
): BaselineResult {
  const byConcept: Record<string, boolean> = {};
  const misconceptions: string[] = [];

  for (const q of questions) {
    if (!q.knowledge) continue;
    const answer = single(answers, q.id);
    const isCorrect = answer === q.knowledge.correct;
    byConcept[q.knowledge.concept] = isCorrect;
    const misconception = answer ? q.knowledge.misconceptions?.[answer] : undefined;
    if (misconception) misconceptions.push(misconception);
  }

  const total = Object.keys(byConcept).length;
  const correct = Object.values(byConcept).filter(Boolean).length;

  const rawConfidence = Number(single(answers, 'confidence')?.replace('c', ''));
  const confidence = [1, 2, 3, 4].includes(rawConfidence) ? (rawConfidence as 1 | 2 | 3 | 4) : null;
  const experience = answers.experience;

  return {
    version: 1,
    completedAt: now,
    level: levelFor(correct, total),
    knowledge: { correct, total, byConcept, misconceptions },
    confidence,
    experience: Array.isArray(experience) ? experience.filter((x) => x !== 'none') : [],
    moneySource: single(answers, 'moneySource'),
    goal: single(answers, 'goal'),
    focus: single(answers, 'focus'),
    style: single(answers, 'style'),
  };
}
