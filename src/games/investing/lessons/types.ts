export type Level = 1 | 2 | 3;
export type Fmt = 'rupees' | 'percent' | 'number';

/** A number the lesson story gives us (an input, not derived). `percent` values are fractions (0.08 = 8%). */
export interface VarDef {
  value: number;
  fmt?: Fmt;
  round?: number;
}

/**
 * A number the lesson derives by calling a function from engine/finance (or a tiny helper: add, sub, mul, div).
 * `args` are numbers, or "$name" to use a var or an earlier calc (raw, unrounded).
 * Rounding is applied only when the number is shown.
 */
export interface CalcDef {
  id: string;
  fn: string;
  args: (number | string)[];
  fmt?: Fmt;
  round?: number;
}

export type BlockType =
  | 'hook'
  | 'define'
  | 'analogy'
  | 'note'
  | 'worked'
  | 'predict'
  | 'tradeoff'
  | 'misconception'
  | 'formula'
  | 'jargon';

export type PredictInput =
  | { kind: 'slider'; min: number; max: number; step: number; unit: string }
  | { kind: 'options'; options: { id: string; textKey: string }[]; correct: string };

export interface PredictSpec {
  questionKey: string;
  input: PredictInput;
  reveal: {
    /** calc id for the true value (slider predictions) */
    actual?: string;
    /** calc ids bounding the honest range shown with the reveal */
    rangeLow?: string;
    rangeHigh?: string;
    explainKey: string;
  };
}

export interface LessonBlock {
  type: BlockType;
  textKey?: string;
  /** Lowest level that sees this block (default 1). L1 = story, L2 = numbers, L3 = formulas. */
  minLevel?: Level;
  /** For 'misconception' blocks. */
  misconceptions?: string[];
  /** For 'jargon' blocks: glossary term ids. */
  terms?: string[];
  predict?: PredictSpec;
}

export interface Lesson {
  id: string;
  kind: 'lesson';
  pillar: 'invest';
  order: number;
  estMinutes: number;
  concepts: string[];
  misconceptions: string[];
  levels: Level[];
  vars?: Record<string, VarDef>;
  calcs?: CalcDef[];
  blocks: LessonBlock[];
  /** Check item ids (see checks.json). */
  check: string[];
  glossary: string[];
}

export interface CheckOption {
  id: string;
  textKey: string;
  /** Set on a wrong option that exposes a named misconception. */
  misconception?: string;
}

export interface CheckItem {
  id: string;
  lesson: string;
  concept: string;
  level: Level;
  stemKey: string;
  options: CheckOption[];
  correct: string;
  whyKey: string;
  vars?: Record<string, VarDef>;
  /** A calc with id "answer" supplies {answer} in the correct option's text. */
  calcs?: CalcDef[];
}

export interface GlossaryEntry {
  id: string;
  termKey: string;
  defKey: string;
  lesson: string;
}

export type Strings = Record<string, string>;
