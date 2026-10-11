/**
 * Story scripts: NPC dialogue, choices, quizzes and quests are JSON data in
 * content/story/, run by this interpreter. The interpreter is pure: it reads
 * state and dispatches engine actions through a Host the UI provides, and
 * waits on the Host for anything the player does (read a line, pick an
 * option, answer a quiz, use a shop). Owner: P2.
 */
import { emergencyFund, GOAL_DEFS, goalFunds, needsBought, needsCost, type Action, type LifeState } from '@/core/engine';
import type { Level, MiniGameResult } from '@/core/types';
import type { Pos } from '@/core/world';
import { gameEffectsToActions } from './gameEffects';

// ── Conditions ──────────────────────────────────────────────────────────
// A condition is terms joined by "&&" and "||" ("&&" binds tighter), e.g.
//   "chapter>=2 && !flag:met_kabir"   "cash>=500 || bank>=500"
// Terms: flag:x · badge:x · chapter, month, cash, bank, savings, peace,
// safety, trust, monthsInChapter (with = == != < <= > >=) · account · upi ·
// needs · insured · loan · loan:kind · invested · bonds · stage:x ·
// source:x · goal:x · goalKind:x · goalAt:x · journal:x · mastered:x.
// Prefix "!" negates a term.

const NUMBERS: Record<string, (s: LifeState) => number> = {
  chapter: (s) => s.chapter,
  month: (s) => s.month,
  cash: (s) => s.cash,
  bank: (s) => s.bank.balance,
  savings: (s) => emergencyFund(s),
  peace: (s) => s.peace,
  safety: (s) => s.safety,
  trust: (s) => s.trust,
  monthsInChapter: (s) => s.month - s.chapterStartMonth,
  goalLeft: (s) => s.goal.target - s.pot,
  /** How much more you need to buy your goal today, counting all your money. */
  goalGap: (s) => s.goal.target - goalFunds(s),
  goalsDone: (s) => s.goalsDone.length,
  pot: (s) => s.pot,
  /** How many months of needs your savings cover. */
  fundMonths: (s) => Math.floor(emergencyFund(s) / Math.max(1, needsCost(s))),
  creditScore: (s) => s.creditScore ?? 0,
};

function term(raw: string, s: LifeState): boolean {
  const t = raw.trim();
  if (!t || t === 'true') return true;
  if (t === 'false') return false;
  if (t.startsWith('!')) return !term(t.slice(1), s);

  const cmp = /^(\w+)\s*(==|=|!=|<=|>=|<|>)\s*(-?\d+)$/.exec(t);
  if (cmp) {
    const [, name, op, num] = cmp;
    const get = NUMBERS[name!];
    if (!get) throw new Error(`unknown number "${name}" in condition`);
    const a = get(s);
    const b = Number(num);
    switch (op) {
      case '=':
      case '==':
        return a === b;
      case '!=':
        return a !== b;
      case '<':
        return a < b;
      case '<=':
        return a <= b;
      case '>':
        return a > b;
      default:
        return a >= b;
    }
  }

  const [key, arg] = t.split(':') as [string, string | undefined];
  switch (key) {
    case 'flag':
      return !!s.flags[arg ?? ''];
    case 'badge':
      return s.badges.includes(arg ?? '');
    case 'account':
      return s.bank.open;
    case 'upi':
      return s.bank.upi;
    case 'needs':
      return needsBought(s);
    case 'insured':
      return s.insured;
    case 'loan':
      return arg ? s.loans.some((l) => l.kind === arg) : s.loans.length > 0;
    case 'invested':
      return Object.keys(s.holdings).length > 0;
    case 'bonds':
      return s.bonds.length > 0;
    case 'deposits':
      return s.deposits.length > 0;
    case 'stage':
      return s.lifeStage === arg;
    case 'source':
      return s.source === arg;
    case 'goal':
      return s.goal.id === arg;
    case 'journal':
      return !!s.journal[arg ?? ''];
    case 'mastered':
      return s.journal[arg ?? ''] === 'mastered';
    case 'done':
      return s.goalsDone.includes(arg as never);
    case 'goalKind':
      return GOAL_DEFS[s.goal.id]?.kind === arg;
    case 'goalAt':
      return GOAL_DEFS[s.goal.id]?.where === arg;
    case 'worked':
      return s.workedMonth === s.month;
    case 'sip':
      return s.bank.sip > 0;
    case 'autosave':
      return s.bank.autoSave > 0;
    default:
      throw new Error(`unknown condition "${t}"`);
  }
}

export function evalCond(expr: string, state: LifeState): boolean {
  return expr.split('||').some((any) => any.split('&&').every((all) => term(all, state)));
}

/** Checks a condition's syntax without a real state (for the content tests). */
export function condTerms(expr: string): string[] {
  return expr
    .split(/\|\||&&/)
    .map((t) => t.trim().replace(/^!/, ''))
    .filter(Boolean);
}

// ── Script steps ────────────────────────────────────────────────────────

export type LogSpec = { concept: string; choice: string; correct?: boolean; misconception?: string };

export type ChoiceOption = { label: string; when?: string; do?: Step[]; log?: LogSpec };

export type Step =
  | { say: string; who?: string }
  | { choice: ChoiceOption[]; prompt?: string; who?: string }
  | { if: string; then?: Step[]; else?: Step[] }
  | { do: Action }
  | { flag: string; value?: boolean }
  | { objective: string }
  | { chapter: number }
  | { badge: string }
  | { concept: string }
  | { quiz: string[]; pass?: number; then?: Step[]; else?: Step[] }
  | { open: string }
  | { sleep: true }
  | { warp: Pos }
  | { call: string }
  | { once: string; do: Step[] }
  | { log: LogSpec }
  | { toast: string }
  | { duel: string; win?: Step[]; lose?: Step[] }
  /**
   * Hands over to a registered MiniGame (GAME_DESIGN §"Script commands"). The
   * game teaches its own concepts, so what it reports comes back as Journal
   * progress; `then` runs once the player is out of it.
   *
   * `params` stages the scene inside the game (which shock, whose money).
   * `apply` turns the game's simple effects (deposits, meters, a sharper goal)
   * into story money; see gameEffects.ts. `on` runs story steps for a choice
   * made inside the game, keyed "stepId:choiceId" (e.g. "sm03.choose:family"),
   * so the story decides what that choice really costs.
   */
  | {
      minigame: string;
      level?: Level;
      params?: Record<string, unknown>;
      apply?: boolean;
      on?: Record<string, Step[]>;
      then?: Step[];
    }
  | { checkpoint: string }
  | { end: true };

export type Scripts = Record<string, Step[]>;

export type QuizResult = { id: string; correct: boolean }[];

export interface Host {
  state(): LifeState;
  dispatch(action: Action): void;
  say(text: string, who?: string): Promise<void>;
  choose(labels: string[], prompt?: string, who?: string): Promise<number>;
  concept(id: string): Promise<void>;
  quiz(ids: string[]): Promise<QuizResult>;
  open(panel: string): Promise<void>;
  sleep(): Promise<void>;
  warp(to: Pos): void;
  log(spec: LogSpec): void;
  /** Shows the player why a decision was good or poor. Called once the choice has played out; optional, so a headless host can skip it. */
  feedback?(spec: LogSpec): Promise<void>;
  toast(text: string): void;
  /** A Scam Duel; resolves with who won. */
  duel(id: string): Promise<'win' | 'lose'>;
  /** Runs a registered MiniGame and resolves with what the player did in it. */
  minigame(id: string, level: Level, params?: Record<string, unknown>): Promise<MiniGameResult>;
  /** Saves a What-If checkpoint for the scene being played. */
  checkpoint(label: string): void;
}

const END = Symbol('end');

/** Runs a script to the end (or to an {end:true}). */
export async function runScript(scripts: Scripts, id: string, host: Host): Promise<void> {
  const steps = scripts[id];
  if (!steps) throw new Error(`unknown script ${id}`);
  try {
    await runSteps(scripts, steps, host, 0);
  } catch (e) {
    if (e !== END) throw e;
  }
}

async function runSteps(scripts: Scripts, steps: Step[], host: Host, depth: number): Promise<void> {
  if (depth > 20) throw new Error('script call depth exceeded');
  for (const step of steps) await runStep(scripts, step, host, depth);
}

async function runStep(scripts: Scripts, step: Step, host: Host, depth: number): Promise<void> {
  const state = host.state();
  if ('say' in step) return host.say(step.say, step.who);
  if ('choice' in step) {
    const options = step.choice.filter((o) => !o.when || evalCond(o.when, state));
    if (!options.length) return;
    const picked = options[await host.choose(options.map((o) => o.label), step.prompt, step.who)];
    if (!picked) return;
    if (picked.log) host.log(picked.log);
    try {
      await runSteps(scripts, picked.do ?? [], host, depth + 1);
    } finally {
      // After the choice has played out (even if it ended the scene), say why it was good or poor.
      if (picked.log) await host.feedback?.(picked.log);
    }
    return;
  }
  if ('if' in step) {
    return runSteps(scripts, (evalCond(step.if, state) ? step.then : step.else) ?? [], host, depth + 1);
  }
  if ('do' in step && !('once' in step)) return host.dispatch(step.do);
  if ('once' in step) {
    if (state.flags[step.once]) return;
    host.dispatch({ type: 'flag', name: step.once });
    return runSteps(scripts, step.do, host, depth + 1);
  }
  if ('flag' in step) return host.dispatch({ type: 'flag', name: step.flag, value: step.value ?? true });
  if ('objective' in step) return host.dispatch({ type: 'objective', key: step.objective });
  if ('chapter' in step) return host.dispatch({ type: 'chapter', n: step.chapter });
  if ('badge' in step) return host.dispatch({ type: 'badge', id: step.badge });
  if ('concept' in step) {
    host.dispatch({ type: 'seeConcept', id: step.concept });
    return host.concept(step.concept);
  }
  if ('quiz' in step) {
    const results = await host.quiz(step.quiz);
    const right = results.filter((r) => r.correct).length;
    const pass = step.pass ?? step.quiz.length;
    return runSteps(scripts, (right >= pass ? step.then : step.else) ?? [], host, depth + 1);
  }
  if ('open' in step) return host.open(step.open);
  if ('sleep' in step) return host.sleep();
  if ('warp' in step) return host.warp(step.warp);
  if ('call' in step) {
    const sub = scripts[step.call];
    if (!sub) throw new Error(`unknown script ${step.call}`);
    return runSteps(scripts, sub, host, depth + 1);
  }
  if ('log' in step) return host.log(step.log);
  if ('toast' in step) return host.toast(step.toast);
  if ('duel' in step) {
    const result = await host.duel(step.duel);
    return runSteps(scripts, (result === 'win' ? step.win : step.lose) ?? [], host, depth + 1);
  }
  if ('minigame' in step) {
    const result = await host.minigame(step.minigame, step.level ?? 1, step.params);
    // A mini-game's conceptDeltas are mastery targets (§10.3), so a high
    // target means the player showed they understood it. That is the same
    // signal a right answer gives, so it moves the Journal the same way.
    for (const [concept, target] of Object.entries(result.conceptDeltas)) {
      host.dispatch({ type: 'learn', concept, correct: target >= 0.7 });
    }
    // Logged against a concept the game taught, because the facilitator heatmap
    // groups by concept. (Every game reports one; the id is only a last resort.)
    const concept = Object.keys(result.conceptDeltas)[0] ?? step.minigame;
    for (const misconception of result.misconceptions) {
      host.log({ concept, choice: step.minigame, correct: false, misconception });
    }
    // The first slip gets an explanation and a way to practise it; the game already showed its own results.
    const slip = result.misconceptions[0];
    if (slip) await host.feedback?.({ concept, choice: step.minigame, correct: false, misconception: slip });
    if (step.apply) for (const action of gameEffectsToActions(result.effects)) host.dispatch(action);
    for (const choice of result.choices) {
      const branch = step.on?.[`${choice.stepId}:${choice.choiceId}`];
      if (branch) await runSteps(scripts, branch, host, depth + 1);
    }
    return runSteps(scripts, step.then ?? [], host, depth + 1);
  }
  if ('checkpoint' in step) return host.checkpoint(step.checkpoint);
  if ('end' in step) throw END;
}

/** Every step in a script tree, for content checks. */
export function walkSteps(steps: Step[], visit: (s: Step) => void): void {
  for (const s of steps) {
    visit(s);
    if ('choice' in s) for (const o of s.choice) walkSteps(o.do ?? [], visit);
    if ('if' in s || 'quiz' in s) {
      walkSteps(s.then ?? [], visit);
      walkSteps(s.else ?? [], visit);
    }
    if ('duel' in s) {
      walkSteps(s.win ?? [], visit);
      walkSteps(s.lose ?? [], visit);
    }
    if ('once' in s) walkSteps(s.do, visit);
    if ('minigame' in s) {
      for (const branch of Object.values(s.on ?? {})) walkSteps(branch, visit);
      walkSteps(s.then ?? [], visit);
    }
  }
}

/** A script that runs by itself when the player is on `map` (any map if omitted) and `when` is true. */
export type AutoScript = { script: string; when: string; map?: string };

/** The first auto script that should run now, if any. */
export function pendingAuto(autos: AutoScript[], state: LifeState, map: string): AutoScript | undefined {
  return autos.find((a) => (!a.map || a.map === map) && evalCond(a.when, state));
}
