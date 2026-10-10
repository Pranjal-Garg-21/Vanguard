/**
 * Builds a "day in the inbox" script from a pool of messages. Same seed, same
 * day. Every scam has red flags; real messages have none, and blocking one
 * counts as a false alarm. Pure. Owner: P5.
 */
import { makeRng } from './rng';
import type { Action, Scenario, Step, Surface } from './types';

export type PoolItem = {
  id: string;
  kind: 'scam' | 'genuine';
  tactic: string;
  level: 1 | 2 | 3;
  concept: string;
  misconception?: string;
  /** The message itself, without actions. */
  surface: Surface;
  /** What would have happened if the student opened a scam. */
  whatIf?: { loss: number };
};

export type InboxOptions = { seed: number; count?: number; level?: 1 | 2 | 3 };

const RESPONSES = ['block', 'ignore', 'open', 'ask'] as const;

function responsesFor(item: PoolItem): Action[] {
  const scam = item.kind === 'scam';
  const isCall = item.surface.type === 'call';
  const label = (r: (typeof RESPONSES)[number]) => (isCall && r === 'open' ? 'safe.inbox.a.callback' : `safe.inbox.a.${r}`);
  return RESPONSES.map((r): Action => {
    if (r === 'open') {
      return scam
        ? {
            id: 'open',
            labelKey: label(r),
            risk: 'risky',
            effects: { 'money.bank': -(item.whatIf?.loss ?? 0) },
            unlocks: [`${item.id}__whatif`],
            delay: 400,
            ...(item.misconception ? { misconception: item.misconception } : {}),
          }
        : { id: 'open', labelKey: label(r), risk: 'safe' };
    }
    if (r === 'block') {
      return scam
        ? { id: 'block', labelKey: label(r), risk: 'safe' }
        : { id: 'block', labelKey: label(r), risk: 'risky', misconception: 'distrust_everything' };
    }
    return { id: r, labelKey: label(r), risk: 'safe' };
  });
}

/** One day: mostly scams, at least one real message, in an order that depends on the seed. */
export function buildInboxDay(pool: PoolItem[], { seed, count = 6, level = 2 }: InboxOptions): Scenario {
  const rng = makeRng(seed);
  const eligible = pool.filter((p) => p.level <= level);
  const genuine = rng.shuffle(eligible.filter((p) => p.kind === 'genuine'));
  const scams = rng.shuffle(eligible.filter((p) => p.kind === 'scam'));
  // About one real message in four, never fewer than one.
  const genuineCount = Math.min(genuine.length, Math.max(1, Math.round(count / 4)));
  const chosen = rng.shuffle([...genuine.slice(0, genuineCount), ...scams.slice(0, Math.max(0, count - genuineCount))]);

  const steps: Step[] = [];
  let at = 1200;
  for (const item of chosen) {
    steps.push({
      id: item.id,
      at,
      surface: {
        ...item.surface,
        concept: item.concept,
        respond: true,
        genuine: item.kind === 'genuine',
        actions: responsesFor(item),
        ...(item.misconception ? { misconception: item.misconception } : {}),
      } as Surface,
    });
    if (item.kind === 'scam') {
      steps.push({
        id: `${item.id}__whatif`,
        surface: {
          type: 'page',
          url: '',
          titleKey: 'safe.whatif.title',
          foreground: true,
          concept: item.concept,
          body: [{ k: `safe.whatif.${item.id}` }],
          actions: [{ id: 'continue', labelKey: 'safe.inbox.next', risk: 'neutral', close: true }],
        },
      });
    }
    at += rng.int(1600, 3200);
  }

  return {
    id: `inbox_day_${seed}`,
    simulator: 'inbox',
    mode: 'act',
    concepts: [...new Set(chosen.map((c) => c.concept))],
    level,
    titleKey: 'safe.inbox.title',
    briefKey: 'safe.inbox.brief',
    // The day runs fast: one real second is about twenty minutes on the phone.
    phone: { startBalance: 12000, startTime: '08:30', clockRate: 20 },
    objectives: [
      { id: 'o1', textKey: 'safe.inbox.o1', when: 'read:1' },
      { id: 'o2', textKey: 'safe.inbox.o2', when: 'inspectedAny:1' },
      { id: 'o3', textKey: 'safe.inbox.o3', when: 'ended' },
    ],
    steps,
  };
}
