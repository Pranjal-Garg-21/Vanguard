/**
 * Starting-point questions: what the student already knows, where they are,
 * and what they want. Text lives in content/i18n/en/baseline.json under
 * `q.<id>.title`, `q.<id>.body` (optional) and `q.<id>.options.<optionId>`.
 *
 * Privacy rules (Implementation.md §2.2): no amounts, no family details, no
 * typing. Every question can be skipped or answered "not sure".
 */

export type BaselineSection = 'about' | 'goals' | 'knowledge';

export type BaselineOption = { id: string };

export type BaselineQuestion = {
  id: string;
  section: BaselineSection;
  /** "multi" lets the student tick several; "none" is then exclusive. */
  kind: 'single' | 'multi';
  /** True when the string bundle has a `body` (a short scenario) for it. */
  hasBody?: boolean;
  options: BaselineOption[];
  /** Present only for questions with a right answer. */
  knowledge?: {
    concept: string;
    correct: string;
    /** Wrong option → misconception ID, for the facilitator heatmap. */
    misconceptions?: Record<string, string>;
  };
};

export const NOT_SURE = 'not_sure';

export const BASELINE_QUESTIONS: BaselineQuestion[] = [
  // ── About you (no amounts, nothing typed) ──────────────────────────────
  {
    id: 'confidence',
    section: 'about',
    kind: 'single',
    options: [
      { id: 'c1' },
      { id: 'c2' },
      { id: 'c3' },
      { id: 'c4' },
    ],
  },
  {
    id: 'experience',
    section: 'about',
    kind: 'multi',
    options: [
      { id: 'shop_cash' },
      { id: 'upi' },
      { id: 'bank_visit' },
      { id: 'own_account' },
      { id: 'saved_goal' },
      { id: 'none' },
    ],
  },
  {
    id: 'moneySource',
    section: 'about',
    kind: 'single',
    options: [
      { id: 'family_gives' },
      { id: 'allowance' },
      { id: 'work' },
      { id: 'scholarship' },
      { id: 'none' },
      { id: 'prefer_not' },
    ],
  },

  // ── Your goals ─────────────────────────────────────────────────────────
  {
    id: 'goal',
    section: 'goals',
    kind: 'single',
    options: [
      { id: 'fees' },
      { id: 'device' },
      { id: 'business' },
      { id: 'family' },
      { id: 'emergency' },
      { id: 'unsure' },
    ],
  },
  {
    id: 'focus',
    section: 'goals',
    kind: 'single',
    options: [
      { id: 'banking' },
      { id: 'budgeting' },
      { id: 'saving' },
      { id: 'investing' },
      { id: 'safety' },
    ],
  },
  {
    id: 'style',
    section: 'goals',
    kind: 'single',
    options: [
      { id: 'games' },
      { id: 'stories' },
      { id: 'challenges' },
      { id: 'mix' },
    ],
  },

  // ── Quick check (nobody sees marks; it only picks the starting point) ──
  {
    id: 'needs',
    section: 'knowledge',
    kind: 'single',
    options: [
      { id: 'sneakers' },
      { id: 'buspass' },
      { id: 'snacks' },
      { id: 'gametopup' },
    ],
    knowledge: { concept: 'needs_vs_wants', correct: 'buspass' },
  },
  {
    id: 'saveFirst',
    section: 'knowledge',
    kind: 'single',
    options: [
      { id: 'leftover' },
      { id: 'first' },
      { id: 'big_only' },
    ],
    knowledge: {
      concept: 'pay_yourself_first',
      correct: 'first',
      misconceptions: { leftover: 'save_what_is_left', big_only: 'saving_needs_big_amount' },
    },
  },
  {
    id: 'interest',
    section: 'knowledge',
    kind: 'single',
    options: [
      { id: 'a1040' },
      { id: 'a1400' },
      { id: 'a1000' },
    ],
    knowledge: {
      concept: 'simple_interest',
      correct: 'a1040',
      misconceptions: { a1400: 'interest_misread', a1000: 'bank_gives_no_return' },
    },
  },
  {
    id: 'prize',
    section: 'knowledge',
    kind: 'single',
    hasBody: true,
    options: [
      { id: 'pay' },
      { id: 'ignore' },
      { id: 'forward' },
      { id: 'call' },
    ],
    knowledge: {
      concept: 'scam_advance_fee',
      correct: 'ignore',
      misconceptions: { pay: 'advance_fee_is_normal', call: 'verify_by_calling_sender', forward: 'sharing_is_harmless' },
    },
  },
  {
    id: 'upiPin',
    section: 'knowledge',
    kind: 'single',
    options: [
      { id: 'true' },
      { id: 'false' },
    ],
    knowledge: {
      concept: 'upi_collect',
      correct: 'false',
      misconceptions: { true: 'pin_needed_to_receive' },
    },
  },
];
