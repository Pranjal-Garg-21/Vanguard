/**
 * Paisapur's story content: every script in content/story/*.json, the auto
 * scripts, the concept list and the quiz bank. Pure data loading.
 */
import conceptsJson from '@/content/concepts.json';
import quizJson from '@/content/paisapur/quiz.json';
import autoJson from '@/content/story/auto.json';
import type { AutoScript, Scripts, Step } from './index';

const files = import.meta.glob<Record<string, Step[]>>('../../content/story/*.json', { eager: true, import: 'default' });

function collect(): Scripts {
  const scripts: Scripts = {};
  for (const [path, file] of Object.entries(files)) {
    if (path.endsWith('/auto.json')) continue;
    for (const [id, steps] of Object.entries(file)) {
      if (scripts[id]) throw new Error(`script "${id}" is defined twice (${path})`);
      scripts[id] = steps;
    }
  }
  return scripts;
}

export const SCRIPTS: Scripts = collect();

export const AUTOS: AutoScript[] = autoJson.auto;

export type ConceptDef = { id: string; pillar: string; chapter: number; icon: string };
export const CONCEPTS: ConceptDef[] = conceptsJson.concepts;
export const MISCONCEPTIONS: string[] = conceptsJson.misconceptions;

export type QuizQuestion = {
  id: string;
  concept: string;
  options: string[];
  answer: string;
  misconceptions?: Record<string, string>;
};
export const QUIZ: QuizQuestion[] = quizJson.questions as QuizQuestion[];

export function quizById(id: string): QuizQuestion | undefined {
  return QUIZ.find((q) => q.id === id);
}

/** The six badges, one per chapter, in order. */
export const BADGES = ['banked', 'budget', 'saver', 'borrower', 'investor', 'shield'] as const;

/** Panels a script can open with {"open": …}. */
export const PANELS = [
  'bank',
  'shop:zaroorat',
  'shop:shauq',
  'loan:bank',
  'loan:moneylender',
  'bonds',
  'exchange',
  'news',
  'journal',
  'wallet',
  'year',
  'loan:education',
  'whatif',
  'rival',
] as const;
export type Panel = (typeof PANELS)[number];
