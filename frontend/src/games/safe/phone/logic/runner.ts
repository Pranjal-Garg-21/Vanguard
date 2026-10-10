/**
 * Script runner: a pure reducer. The same script plus the same list of
 * actions always gives the same state, which is what makes the post-mortem
 * replay exact. There is no randomness. Owner: P5.
 */
import type { Action, HistoryEntry, RunAction, RunState, Scenario, Surface } from './types';

export const DEFAULT_DELAY = 600;

/** A call or permission dialog that takes over the screen and waits for an answer. */
export function isOverlay(script: Scenario, surface: Surface): boolean {
  return script.mode === 'act' && !surface.respond && (surface.type === 'call' || surface.type === 'permission');
}

export function surfaceOf(script: Scenario, id: string): Surface | undefined {
  return script.steps.find((s) => s.id === id)?.surface;
}

export function createRun(script: Scenario, opts: { timersOff?: boolean } = {}): RunState {
  const pending = script.steps
    .filter((s) => s.at !== undefined)
    .map((s) => ({ at: s.at as number, step: s.id }))
    .sort((a, b) => a.at - b.at);
  return advance(
    {
      script,
      now: 0,
      inbox: [],
      deliveredAt: {},
      pending,
      open: null,
      underlay: null,
      read: [],
      inspected: [],
      acted: {},
      moved: [],
      verdicts: {},
      effects: {},
      history: [],
      outcome: null,
      ended: false,
      timersOff: opts.timersOff ?? false,
    },
    0,
  );
}

function push(state: RunState, entry: HistoryEntry): RunState {
  return { ...state, history: [...state.history, entry] };
}

/** Delivers everything due by `state.now`. */
function deliverDue(state: RunState): RunState {
  let next = state;
  while (next.pending.length > 0 && (next.pending[0] as { at: number }).at <= next.now) {
    const due = next.pending[0] as { at: number; step: string };
    const surface = surfaceOf(next.script, due.step);
    next = { ...next, pending: next.pending.slice(1) };
    if (!surface || next.inbox.includes(due.step)) continue;
    next = push(
      { ...next, inbox: [...next.inbox, due.step], deliveredAt: { ...next.deliveredAt, [due.step]: due.at } },
      { t: due.at, kind: 'delivered', surface: due.step },
    );
    const overlay = isOverlay(next.script, surface);
    if (surface.foreground || overlay) {
      if (overlay) next = { ...next, underlay: next.open };
      next = openSurface(next, due.step);
    }
  }
  return next;
}

function openSurface(state: RunState, id: string): RunState {
  if (!state.inbox.includes(id)) return state;
  const wasOpen = state.open === id;
  const next = { ...state, open: id, read: state.read.includes(id) ? state.read : [...state.read, id] };
  return wasOpen ? next : push(next, { t: state.now, kind: 'opened', surface: id });
}

function expireTimeouts(state: RunState): RunState {
  if (state.timersOff || state.ended) return state;
  let next = state;
  for (const id of state.inbox) {
    const surface = surfaceOf(state.script, id);
    if (!surface?.timeout || next.acted[id] || next.moved.includes(id) || next.ended) continue;
    const startedAt = next.deliveredAt[id] ?? 0;
    if (next.now - startedAt >= surface.timeout.ms) next = act(next, id, surface.timeout.action, true);
  }
  return next;
}

function advance(state: RunState, ms: number): RunState {
  if (state.ended) return state;
  return expireTimeouts(deliverDue({ ...state, now: state.now + ms }));
}

function act(state: RunState, surfaceId: string, actionId: string, auto = false): RunState {
  const surface = surfaceOf(state.script, surfaceId);
  const action: Action | undefined = surface?.actions?.find((a) => a.id === actionId);
  const used = state.history.some((h) => h.kind === 'acted' && h.surface === surfaceId && h.action === actionId);
  if (!surface || !action || used || state.acted[surfaceId] || state.moved.includes(surfaceId) || state.ended) return state;

  const effects = { ...state.effects };
  for (const [path, amount] of Object.entries(action.effects ?? {})) effects[path] = (effects[path] ?? 0) + amount;

  // A neutral step (opening a link) doesn't close the surface: the student can still decide.
  const closes = action.risk !== 'neutral';
  // Moving on to what a neutral step unlocked closes this screen's other options, so the student can't go back and undo a decision.
  const movesOn = !closes && (action.unlocks ?? []).length > 0;
  let next: RunState = { ...state, acted: closes ? { ...state.acted, [surfaceId]: actionId } : state.acted, moved: movesOn ? [...state.moved, surfaceId] : state.moved, effects };
  next = push(next, { t: state.now, kind: 'acted', surface: surfaceId, action: actionId, ...(auto ? { auto } : {}) });

  const delay = action.delay ?? DEFAULT_DELAY;
  const queued = (action.unlocks ?? [])
    .filter((id) => !next.inbox.includes(id) && !next.pending.some((p) => p.step === id))
    .map((id) => ({ at: next.now + delay, step: id }));
  next = { ...next, pending: [...next.pending, ...queued].sort((a, b) => a.at - b.at) };

  if (action.close && next.open === surfaceId) next = { ...next, open: null };
  if (action.end) {
    // Ending well after money already left still counts as having lost money.
    const lost = (next.effects['money.bank'] ?? 0) < 0;
    next = { ...next, ended: true, outcome: lost ? 'fooled' : action.end, open: null };
  }
  else if (next.open === surfaceId && isOverlay(state.script, surface)) next = { ...next, open: next.underlay, underlay: null };
  return finishIfDone(next);
}

/**
 * An inbox run (surfaces marked `respond`) ends by itself once every one has
 * been answered and nothing else is on its way.
 */
function finishIfDone(state: RunState): RunState {
  if (state.ended || state.script.mode !== 'act') return state;
  const needing = state.script.steps.filter((s) => s.surface.respond);
  if (needing.length === 0 || state.pending.length > 0) return state;
  if (!needing.every((s) => state.acted[s.id])) return state;
  // Fooled only if a risky choice actually cost money; a wrong but harmless choice is just scored.
  const fooled = needing.some((s) => {
    const a = s.surface.actions?.find((x) => x.id === state.acted[s.id]);
    return a?.risk === 'risky' && !s.surface.genuine && Object.keys(a.effects ?? {}).length > 0;
  });
  return { ...state, ended: true, outcome: fooled ? 'fooled' : 'safe', open: null };
}

function judge(state: RunState, surfaceId: string, verdict: 'legit' | 'suspicious' | 'scam'): RunState {
  if (!state.inbox.includes(surfaceId) || state.verdicts[surfaceId] || state.ended) return state;
  let next = push({ ...state, verdicts: { ...state.verdicts, [surfaceId]: verdict } }, { t: state.now, kind: 'judged', surface: surfaceId, verdict });
  const all = next.script.steps.filter((s) => s.surface.verdict);
  if (all.every((s) => next.verdicts[s.id])) next = { ...next, ended: true, outcome: null };
  return next;
}

export function reduce(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'tick':
      return advance(state, action.ms);
    case 'open':
      return openSurface(state, action.surface);
    case 'close':
      return state.open ? { ...state, open: null } : state;
    case 'inspect': {
      const key = `${action.surface}:${action.lens}`;
      if (state.inspected.includes(key) || !state.inbox.includes(action.surface)) return state;
      return push({ ...state, inspected: [...state.inspected, key] }, { t: state.now, kind: 'inspected', surface: action.surface, lens: action.lens });
    }
    case 'act':
      return act(state, action.surface, action.action);
    case 'judge':
      return judge(state, action.surface, action.verdict);
  }
}

/** Replays a recorded action log from the start. Same log, same state. */
export function replay(script: Scenario, log: RunAction[], opts: { timersOff?: boolean } = {}): RunState {
  return log.reduce(reduce, createRun(script, opts));
}

/** Tell ids the student uncovered with the lens on this surface. */
export function foundTells(state: RunState, surfaceId: string): string[] {
  const surface = surfaceOf(state.script, surfaceId);
  if (!surface) return [];
  const ids = new Set<string>();
  for (const lens of surface.lens ?? []) {
    if (lens.tell && state.inspected.includes(`${surfaceId}:${lens.id}`)) ids.add(lens.tell);
  }
  return [...ids];
}

/** Every tell on a surface, split into found and missed. */
export function tellReport(state: RunState, surfaceId: string) {
  const surface = surfaceOf(state.script, surfaceId);
  const found = new Set(foundTells(state, surfaceId));
  const tells = surface?.tells ?? [];
  return { found: tells.filter((t) => found.has(t.id)), missed: tells.filter((t) => !found.has(t.id)) };
}

/** Evaluates an objective's `when` condition. */
export function objectiveDone(state: RunState, when: string): boolean {
  const [kind, arg = ''] = when.split(':');
  switch (kind) {
    case 'opened':
      return state.read.includes(arg);
    case 'read':
      return state.read.length >= Number(arg);
    case 'inspected':
      return state.inspected.some((k) => k.endsWith(`:${arg}`));
    case 'acted':
      return Object.values(state.acted).includes(arg);
    case 'judged':
      return arg in state.verdicts;
    case 'inspectedAny':
      return state.inspected.length >= Number(arg || 1);
    case 'ended':
      return state.ended;
    default:
      return false;
  }
}

export function bankBalance(state: RunState): number {
  return state.script.phone.startBalance + (state.effects['money.bank'] ?? 0);
}
