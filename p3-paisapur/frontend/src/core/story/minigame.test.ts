import { describe, expect, it } from 'vitest';

import { runScript, type Host, type Step } from './index';
import type { Action, LifeState } from '@/core/engine';
import { newLife } from '@/core/engine';
import type { MiniGameResult } from '@/core/types';

/** A host that records what the script asked it to do. */
function spyHost(result: MiniGameResult) {
  const calls: { id: string; level: number; params?: Record<string, unknown> }[] = [];
  const actions: Action[] = [];
  const logs: { concept?: string; misconception?: string }[] = [];
  let state: LifeState = newLife(1);

  const host: Host = {
    state: () => state,
    dispatch: (a) => {
      actions.push(a);
    },
    say: async () => {},
    choose: async () => 0,
    concept: async () => {},
    quiz: async () => [],
    open: async () => {},
    sleep: async () => {},
    warp: () => {},
    log: (spec) => logs.push(spec),
    toast: () => {},
    duel: async () => 'win',
    minigame: async (id, level, params) => {
      calls.push({ id, level, ...(params ? { params } : {}) });
      return result;
    },
    checkpoint: () => {},
  };
  return { host, calls, actions, logs, setState: (s: LifeState) => (state = s) };
}

const result = (over: Partial<MiniGameResult> = {}): MiniGameResult => ({
  choices: [],
  conceptDeltas: {},
  misconceptions: [],
  summaryKey: 'x.summary',
  ...over,
});

describe('the minigame script command', () => {
  it('hands the named game and level to the host', async () => {
    const spy = spyHost(result());
    const scripts = { s: [{ minigame: 'jar-split', level: 2 }] as Step[] };
    await runScript(scripts, 's', spy.host);
    expect(spy.calls).toEqual([{ id: 'jar-split', level: 2 }]);
  });

  it('defaults to level 1', async () => {
    const spy = spyHost(result());
    await runScript({ s: [{ minigame: 'swipe-sort' }] as Step[] }, 's', spy.host);
    expect(spy.calls[0]?.level).toBe(1);
  });

  it('moves the Journal for concepts the player showed they understood', async () => {
    // conceptDeltas are mastery targets (§10.3): a high target means they got
    // it, which is the same signal a right quiz answer gives.
    const spy = spyHost(result({ conceptDeltas: { budgeting: 0.9, fixed_vs_variable: 0.2 } }));
    await runScript({ s: [{ minigame: 'jar-split' }] as Step[] }, 's', spy.host);

    const learns = spy.actions.filter((a) => a.type === 'learn');
    expect(learns).toEqual([
      { type: 'learn', concept: 'budgeting', correct: true },
      { type: 'learn', concept: 'fixed_vs_variable', correct: false },
    ]);
  });

  it('reports a misconception the game caught', async () => {
    const spy = spyHost(result({ misconceptions: ['small_spends_dont_matter'] }));
    await runScript({ s: [{ minigame: 'spending-detective' }] as Step[] }, 's', spy.host);
    expect(spy.logs[0]?.misconception).toBe('small_spends_dont_matter');
  });

  it('runs the steps that follow the game', async () => {
    const spy = spyHost(result());
    const scripts = {
      s: [{ minigame: 'debt-ladder', then: [{ flag: 'ladder_done' }] }] as Step[],
    };
    await runScript(scripts, 's', spy.host);
    expect(spy.actions.some((a) => a.type === 'flag' && a.name === 'ladder_done')).toBe(true);
  });

  it('logs a caught misconception against a concept the game taught, not the game id', async () => {
    const spy = spyHost(result({ conceptDeltas: { expense_tracking: 0.4 }, misconceptions: ['small_spends_dont_matter'] }));
    await runScript({ s: [{ minigame: 'spending-detective' }] as Step[] }, 's', spy.host);
    expect(spy.logs[0]).toMatchObject({ concept: 'expense_tracking', misconception: 'small_spends_dont_matter' });
  });

  it('passes the scene setup to the game', async () => {
    const spy = spyHost(result());
    await runScript({ s: [{ minigame: 'surprise-month', params: { shock: 'screen', amount: 1500 } }] as Step[] }, 's', spy.host);
    expect(spy.calls[0]?.params).toEqual({ shock: 'screen', amount: 1500 });
  });

  it('applies simple effects when the script asks: deposits, meters and a sharper goal', async () => {
    const spy = spyHost(
      result({
        effects: {
          'money.bank': 400,
          'money.cash': -400,
          'human.trust': -10,
          'meta.goals.set': { target: 5000, monthly: 300 },
        } as unknown as MiniGameResult['effects'],
      }),
    );
    await runScript({ s: [{ minigame: 'bank-counter', apply: true }] as Step[] }, 's', spy.host);
    expect(spy.actions.filter((a) => a.type !== 'learn')).toEqual([
      { type: 'deposit', amount: 400 },
      { type: 'meter', peace: 0, trust: -10, safety: 0 },
      { type: 'setGoalTarget', amount: 5000 },
      { type: 'setAutoSave', amount: 300 },
    ]);
  });

  it('runs the story branch for the choice made inside the game', async () => {
    const spy = spyHost(result({ choices: [{ stepId: 'sm03.choose', choiceId: 'family', ms: 0 }] }));
    await runScript(
      {
        s: [
          {
            minigame: 'surprise-month',
            on: {
              'sm03.choose:family': [{ flag: 'borrowed_from_mom' }],
              'sm03.choose:loan_app': [{ flag: 'used_app' }],
            },
          },
        ] as Step[],
      },
      's',
      spy.host,
    );
    const flags = spy.actions.filter((a) => a.type === 'flag').map((a) => (a as { name: string }).name);
    expect(flags).toEqual(['borrowed_from_mom']);
  });

  it('does not apply the game’s effects unless the script asks', async () => {
    // Paisapur's engine owns the money, and the scripts' own `do:` actions
    // already move it. Applying a game's effects as well would double-count.
    const spy = spyHost(result({ effects: { 'money.cash': 500 } }));
    await runScript({ s: [{ minigame: 'jar-split' }] as Step[] }, 's', spy.host);
    expect(spy.actions.filter((a) => a.type !== 'learn')).toEqual([]);
  });
});
