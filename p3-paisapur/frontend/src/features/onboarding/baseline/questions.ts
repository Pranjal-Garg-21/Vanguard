/**
 * Starting-point questions: what the student already knows, where they are,
 * and what they want. Text lives in content/i18n/en/baseline.json under
 * `q.<id>.title`, `q.<id>.body` (optional) and `q.<id>.options.<optionId>`.
 *
 * Privacy rules (Implementation.md §2.2): no amounts, no family details, no
 * typing. Every question can be skipped or answered "not sure".
 */

export type BaselineSection = 'about' | 'goals' | 'knowledge';

export type BaselineOption = { id: string; emoji: string };

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
      { id: 'c1', emoji: '😰' },
      { id: 'c2', emoji: '😕' },
      { id: 'c3', emoji: '🙂' },
      { id: 'c4', emoji: '😎' },
    ],
  },
  {
    id: 'experience',
    section: 'about',
    kind: 'multi',
    options: [
      { id: 'shop_cash', emoji: '🛒' },
      { id: 'upi', emoji: '📱' },
      { id: 'bank_visit', emoji: '🏦' },
      { id: 'own_account', emoji: '💳' },
      { id: 'saved_goal', emoji: '🐷' },
      { id: 'none', emoji: '🌱' },
    ],
  },
  {
    id: 'moneySource',
    section: 'about',
    kind: 'single',
    options: [
      { id: 'family_gives', emoji: '🏠' },
      { id: 'allowance', emoji: '📅' },
      { id: 'work', emoji: '🛠️' },
      { id: 'scholarship', emoji: '🎓' },
      { id: 'none', emoji: '🙅' },
      { id: 'prefer_not', emoji: '🤐' },
    ],
  },

  // ── Your goals ─────────────────────────────────────────────────────────
  {
    id: 'goal',
    section: 'goals',
    kind: 'single',
    options: [
      { id: 'fees', emoji: '🎓' },
      { id: 'device', emoji: '📱' },
      { id: 'business', emoji: '🏪' },
      { id: 'family', emoji: '👨‍👩‍👧' },
      { id: 'emergency', emoji: '🛟' },
      { id: 'unsure', emoji: '🤔' },
    ],
  },
  {
    id: 'focus',
    section: 'goals',
    kind: 'single',
    options: [
      { id: 'banking', emoji: '🏦' },
      { id: 'budgeting', emoji: '📒' },
      { id: 'saving', emoji: '🐷' },
      { id: 'investing', emoji: '📈' },
      { id: 'safety', emoji: '🛡️' },
    ],
  },
  {
    id: 'style',
    section: 'goals',
    kind: 'single',
    options: [
      { id: 'games', emoji: '🎮' },
      { id: 'stories', emoji: '📖' },
      { id: 'challenges', emoji: '⏱️' },
      { id: 'mix', emoji: '🎲' },
    ],
  },

  // ── Quick check (nobody sees marks; it only picks the starting point) ──
  {
    id: 'needs',
    section: 'knowledge',
    kind: 'single',
    options: [
      { id: 'sneakers', emoji: '👟' },
      { id: 'buspass', emoji: '🚌' },
      { id: 'snacks', emoji: '🍟' },
      { id: 'gametopup', emoji: '🎮' },
    ],
    knowledge: { concept: 'needs_vs_wants', correct: 'buspass' },
  },
  {
    id: 'saveFirst',
    section: 'knowledge',
    kind: 'single',
    options: [
      { id: 'leftover', emoji: '🪙' },
      { id: 'first', emoji: '🐷' },
      { id: 'big_only', emoji: '💰' },
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
      { id: 'a1040', emoji: '🏦' },
      { id: 'a1400', emoji: '📈' },
      { id: 'a1000', emoji: '🟰' },
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
      { id: 'pay', emoji: '💸' },
      { id: 'ignore', emoji: '🚫' },
      { id: 'forward', emoji: '↗️' },
      { id: 'call', emoji: '📞' },
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
      { id: 'true', emoji: '✅' },
      { id: 'false', emoji: '❌' },
    ],
    knowledge: {
      concept: 'upi_collect',
      correct: 'false',
      misconceptions: { true: 'pin_needed_to_receive' },
    },
  },
];
