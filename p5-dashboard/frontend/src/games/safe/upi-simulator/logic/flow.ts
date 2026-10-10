/**
 * The UPI Simulator as a state machine (D5.1 B): named chapters and the only
 * moves allowed between them, so a timer or a tap can never land in the wrong
 * place. Pure. Owner: P5.
 *
 *   intro > link > setPin > payScan > payPin > paid
 *     > collect > rule > qr > refund > check > done
 *
 * `collect` and `qr` are phone scripts played by the shared phone; their
 * results come back as events.
 */
import type { MiniGameChoice, MiniGameResult, PlayMode } from '@/core/types';

export const CHAPTERS = ['intro', 'link', 'setPin', 'payScan', 'payPin', 'paid', 'collect', 'rule', 'qr', 'refund', 'check', 'done'] as const;
export type Chapter = (typeof CHAPTERS)[number];

/** Tasks shown in the side panel; each covers one or more chapters. */
export const TASKS: { id: string; titleKey: string; chapters: Chapter[] }[] = [
  { id: 't1', titleKey: 'safe.upi.task.setup', chapters: ['link', 'setPin'] },
  { id: 't2', titleKey: 'safe.upi.task.pay', chapters: ['payScan', 'payPin', 'paid'] },
  { id: 't3', titleKey: 'safe.upi.task.collect', chapters: ['collect', 'rule'] },
  { id: 't4', titleKey: 'safe.upi.task.qr', chapters: ['qr', 'refund'] },
  { id: 't5', titleKey: 'safe.upi.task.check', chapters: ['check'] },
];

export const START_BALANCE = 3400;
export const CANTEEN_AMOUNT = 50;
export const MAX_PIN_TRIES = 3;

const WEAK_PINS = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123']);
export const isWeakPin = (pin: string) => WEAK_PINS.has(pin);

export type FlowState = {
  chapter: Chapter;
  balance: number;
  pin: string | null;
  /** Wrong-PIN tries on the current payment. */
  tries: number;
  /** Did the student cover the keypad the last time they typed the PIN? */
  covered: boolean;
  choices: MiniGameChoice[];
  misconceptions: string[];
  /** Concept → [correct, total]. */
  tally: Record<string, [number, number]>;
  /** Money lost to scams, as a negative number, for LifePath. */
  effects: Record<string, number>;
  /** Red-flag kinds found in the two scam chapters, and whether either cost money. */
  kinds: string[];
  fooled: boolean;
  message: string | null;
};

export type FlowEvent =
  | { type: 'next' }
  | { type: 'link' }
  | { type: 'setPin'; pin: string; covered: boolean }
  | { type: 'scan' }
  | { type: 'pay'; pin: string; covered: boolean }
  | { type: 'script'; chapter: 'collect' | 'qr'; result: MiniGameResult; meta?: { kinds: string[]; fooled: boolean } }
  | { type: 'check'; answers: { id: string; concept: string; correct: boolean; choice: string }[] };

export function createFlow(): FlowState {
  return {
    chapter: 'intro',
    balance: START_BALANCE,
    pin: null,
    tries: 0,
    covered: false,
    choices: [],
    misconceptions: [],
    tally: {},
    effects: {},
    kinds: [],
    fooled: false,
    message: null,
  };
}

const NEXT: Partial<Record<Chapter, Chapter>> = { intro: 'link', paid: 'collect', rule: 'qr', refund: 'check' };

function record(state: FlowState, stepId: string, choiceId: string, correct: boolean | undefined, concept: string): FlowState {
  const tally = { ...state.tally };
  if (correct !== undefined) {
    const [good, total] = tally[concept] ?? [0, 0];
    tally[concept] = [good + (correct ? 1 : 0), total + 1];
  }
  const choice: MiniGameChoice = { stepId, choiceId, ...(correct === undefined ? {} : { correct }), ms: 0, concept };
  return { ...state, choices: [...state.choices, choice], tally };
}

export function reduce(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case 'next': {
      const to = NEXT[state.chapter];
      return to ? { ...state, chapter: to, message: null } : state;
    }
    case 'link':
      return state.chapter === 'link' ? { ...state, chapter: 'setPin' } : state;

    case 'setPin': {
      if (state.chapter !== 'setPin') return state;
      if (isWeakPin(event.pin)) return { ...state, message: 'weak' };
      const next = record(state, 'setPin', event.covered ? 'covered' : 'uncovered', event.covered, 'pin_secrecy');
      return { ...next, pin: event.pin, covered: event.covered, chapter: 'payScan', message: null, misconceptions: event.covered ? next.misconceptions : [...next.misconceptions, 'pin_uncovered'] };
    }
    case 'scan':
      return state.chapter === 'payScan' ? { ...state, chapter: 'payPin', tries: 0, message: null } : state;

    case 'pay': {
      if (state.chapter !== 'payPin') return state;
      if (event.pin !== state.pin) {
        const tries = state.tries + 1;
        // After three wrong tries the payment is cancelled, as a real bank would lock it.
        return tries >= MAX_PIN_TRIES ? { ...state, chapter: 'payScan', tries: 0, message: 'locked' } : { ...state, tries, message: 'wrong' };
      }
      let next = record(state, 'canteen_pay', 'paid', true, 'pin_secrecy');
      if (!event.covered) next = { ...next, misconceptions: [...next.misconceptions, 'pin_uncovered'] };
      return { ...next, balance: state.balance - CANTEEN_AMOUNT, chapter: 'paid', message: null };
    }

    case 'script': {
      if (state.chapter !== event.chapter) return state;
      const { result } = event;
      const tally = { ...state.tally };
      for (const c of result.choices) {
        if (c.correct === undefined) continue;
        const concept = event.chapter === 'collect' ? 'upi_collect' : 'qr_scam';
        const [good, total] = tally[concept] ?? [0, 0];
        tally[concept] = [good + (c.correct ? 1 : 0), total + 1];
      }
      const effects = { ...state.effects };
      for (const [k, v] of Object.entries(result.effects ?? {})) effects[k] = (effects[k] ?? 0) + v;
      return {
        ...state,
        choices: [...state.choices, ...result.choices],
        misconceptions: [...state.misconceptions, ...result.misconceptions],
        tally,
        effects,
        kinds: [...new Set([...state.kinds, ...(event.meta?.kinds ?? [])])],
        fooled: state.fooled || (event.meta?.fooled ?? false),
        balance: state.balance + (result.effects?.['money.bank'] ?? 0),
        chapter: event.chapter === 'collect' ? 'rule' : 'refund',
      };
    }

    case 'check': {
      if (state.chapter !== 'check') return state;
      let next = state;
      for (const a of event.answers) {
        next = record(next, a.id, a.choice, a.correct, a.concept);
        if (!a.correct) next = { ...next, misconceptions: [...next.misconceptions, `check_${a.id}`] };
      }
      return { ...next, chapter: 'done' };
    }
  }
}

export function taskIndex(chapter: Chapter): number {
  const i = TASKS.findIndex((t) => t.chapters.includes(chapter));
  return i === -1 ? (chapter === 'done' ? TASKS.length : -1) : i;
}

/** The finished game as the runtime expects it. Money effects only count in LifePath. */
export function toResult(state: FlowState, mode: PlayMode): MiniGameResult {
  const conceptDeltas: Record<string, number> = {};
  for (const [concept, [good, total]] of Object.entries(state.tally)) conceptDeltas[concept] = total === 0 ? 0 : good / total;
  const lost = Object.keys(state.effects).length > 0;
  return {
    choices: state.choices,
    conceptDeltas,
    misconceptions: [...new Set(state.misconceptions)],
    ...(mode === 'lifepath' && lost ? { effects: { ...state.effects } } : {}),
    summaryKey: 'safe.upi.summary',
  };
}
