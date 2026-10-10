/**
 * Scenario script format for the fake phone. A scam is data, not code: a
 * script lists surfaces (a message, a call, a fake page…) and what the student
 * can do on each. Text is always an i18n key. Owner: P5.
 */

export type Verdict = 'legit' | 'suspicious' | 'scam';
export type Risk = 'safe' | 'risky' | 'neutral';
export type Outcome = 'safe' | 'fooled';

/** The habit a tell teaches. Each becomes a collectible card. */
export const TELL_KINDS = ['urgency', 'too_good', 'asks_secret', 'pretends', 'secrecy', 'odd_link', 'pulls_money'] as const;
export type TellKind = (typeof TELL_KINDS)[number];

/** A warning sign. `whyKey` is the explanation shown in the debrief. */
export type Tell = { id: string; kind: TellKind; whyKey: string };

/** Something the student can inspect with the Scam Lens. Reveals the real detail behind what is shown. */
export type Lens = { id: string; revealKey: string; tell?: string };

/** A run of text. `lens` makes it inspectable; `action` makes it a tappable link. */
export type Segment = { k: string; lens?: string; action?: string };

export type Action = {
  id: string;
  labelKey: string;
  risk: Risk;
  /** Applied when the student does this, e.g. { "money.bank": -4999 }. */
  effects?: Record<string, number>;
  /** Steps delivered after `delay` ms (default 600). */
  unlocks?: string[];
  delay?: number;
  /** Ends the run with this outcome. */
  end?: Outcome;
  /** Misconception this reveals when the choice is risky. */
  misconception?: string;
  /** Tell the student ignored by doing this (shown in the debrief). */
  ignores?: string[];
  /** Closes the screen after this action (used by "what would have happened" cards). */
  close?: boolean;
};

type Common = {
  /** Concept this surface tests (falls back to the script's concepts). */
  concept?: string;
  lens?: Lens[];
  tells?: Tell[];
  /** Act mode: what the student can do. */
  actions?: Action[];
  /** Why this item is real or a scam. Shown in the feedback. */
  explainKey?: string;
  /** Judge mode: the true answer. */
  verdict?: Verdict;
  /** Act mode inbox: the run waits for the student to respond to this one. */
  respond?: boolean;
  /** Inbox: is this a real message? Used to count false alarms. */
  genuine?: boolean;
  misconception?: string;
  /** Opens by itself when delivered (a link that was tapped, a call). */
  foreground?: boolean;
  /** Auto-runs `action` if the student hasn't answered in `ms` (never with timers off). */
  timeout?: { ms: number; action: string };
};

export type Surface = Common &
  (
    | { type: 'sms'; from: string; fromLens?: string; body: Segment[] }
    | { type: 'chat'; from: string; fromLens?: string; online?: boolean; body: Segment[] }
    | { type: 'mail'; fromName: string; fromAddress: string; fromLens?: string; subjectKey: string; body: Segment[] }
    | { type: 'call'; caller: string; callerLens?: string; lines: Segment[] }
    | { type: 'page'; url: string; urlLens?: string; titleKey: string; body: Segment[]; fields?: { id: string; labelKey: string }[] }
    | { type: 'permission'; appKey: string; askKey: string }
    | { type: 'pay-request'; fromName: string; amount: number; noteKey: string; body: Segment[] }
  );
export type SurfaceType = Surface['type'];

export type Step = {
  id: string;
  /** Milliseconds after the run starts. Steps without `at` only appear when unlocked by an action. */
  at?: number;
  surface: Surface;
};

/** A checklist item shown in the mission panel. `when` is evaluated against the run. */
export type Objective = {
  id: string;
  textKey: string;
  /** opened:<surface> | read:<n> | inspected:<lens> | acted:<action> | judged:<surface> | ended */
  when: string;
};

export type SimulatorId = 'upi' | 'inbox' | 'hunter' | 'call';

export type Scenario = {
  id: string;
  /** Which simulator this belongs to, for the picker. */
  simulator?: SimulatorId;
  /** Values for {placeholders} in this script's text (seeded variants). */
  vars?: Record<string, string | number>;
  mode: 'act' | 'judge';
  concepts: string[];
  level: 1 | 2 | 3;
  titleKey: string;
  briefKey: string;
  phone: { startBalance: number; startTime: string; /** Simulated minutes per real second (default 1/60). */ clockRate?: number };
  objectives: Objective[];
  steps: Step[];
};

export type HistoryEntry =
  | { t: number; kind: 'delivered'; surface: string }
  | { t: number; kind: 'opened'; surface: string }
  | { t: number; kind: 'inspected'; surface: string; lens: string }
  | { t: number; kind: 'acted'; surface: string; action: string; auto?: boolean }
  | { t: number; kind: 'judged'; surface: string; verdict: Verdict };

export type RunState = {
  script: Scenario;
  now: number;
  /** Surface ids in delivery order. */
  inbox: string[];
  deliveredAt: Record<string, number>;
  pending: { at: number; step: string }[];
  /** The surface currently open on the phone, if any. */
  open: string | null;
  /** What was open before a call or permission dialog took over the screen. */
  underlay: string | null;
  read: string[];
  inspected: string[];
  /** Surface → action taken. */
  acted: Record<string, string>;
  verdicts: Record<string, Verdict>;
  effects: Record<string, number>;
  history: HistoryEntry[];
  outcome: Outcome | null;
  ended: boolean;
  timersOff: boolean;
};

export type RunAction =
  | { type: 'tick'; ms: number }
  | { type: 'open'; surface: string }
  | { type: 'close' }
  | { type: 'inspect'; surface: string; lens: string }
  | { type: 'act'; surface: string; action: string }
  | { type: 'judge'; surface: string; verdict: Verdict };
