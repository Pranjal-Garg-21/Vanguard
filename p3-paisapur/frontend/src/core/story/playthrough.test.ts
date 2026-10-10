/**
 * A bot plays the whole year through the real scripts and engine: it makes
 * sensible choices, shops for needs, saves, sleeps and answers every quiz.
 * If a chapter gate can't be reached, this test fails.
 */
import { describe, expect, it } from 'vitest';
import { GOAL_DEFS, monthlyNeeds, netWorth, newLife, reduce, type Action, type GoalId, type IncomeSource, type LifeState } from '@/core/engine';
import { simulateKabir } from '@/core/rival';
import { AUTOS, CONCEPTS, quizById, SCRIPTS } from './content';
import { pendingAuto, runScript, type Host } from './index';

type Setup = { goal: GoalId; source: IncomeSource; stage?: 'school' | 'college'; loseDuels?: boolean };

/** Labels the bot prefers, best first. Anything else: the last option (usually "Bye"). */
const prefer = (o: Setup) => [
  'choice.challenge_yes', 'choice.challenge', 'choice.goal_buy', 'choice.goal_buy_yes',
  'choice.look_a', `choice.stage_${o.stage ?? 'school'}`, `choice.source_${o.source}`, `choice.goal_${o.goal}`,
  'choice.emi_save', 'choice.windfall_most', 'choice.lump_plan', 'choice.grocery_list', 'choice.just_chat',
  'choice.acc_savings', 'choice.dep_1000', 'choice.sms_ignore', 'choice.qr_refuse',
  'choice.sleep', 'choice.sleep_anyway', 'choice.autosave_200', 'choice.kabir_budget', 'choice.work_yes',
  'choice.crack_savings', 'choice.crack_cash', 'choice.lend_no', 'choice.job_ignore',
  'choice.app_refuse', 'choice.call_hangup', 'choice.kabir_report', 'choice.card_no',
  'choice.buy_bonds', 'choice.trade', 'choice.kabir_warn', 'choice.ponzi_ask', 'choice.ins_buy',
];

/** What each mini-game teaches. Mirrors each game's index.ts. */
const MINIGAME_CONCEPTS: Record<string, string[]> = {
  'document-hunt': ['kyc', 'why_bank'],
  'bank-counter': ['why_bank', 'savings_account', 'minimum_balance_fees', 'nominee', 'pin_secrecy'],
  'swipe-sort': ['needs_wants', 'context_dependence'],
  'jar-split': ['budgeting', 'fixed_vs_variable'],
  'goal-builder': ['goal_setting'],
  'spending-detective': ['expense_tracking'],
  'surprise-month': ['emergency_fund'],
  'debt-ladder': ['loan_basics', 'bnpl'],
  'rescue-mission': ['fraud_recovery'],
};

function bot(start: LifeState, setup: Setup) {
  const PREFER = prefer(setup);
  const duels: string[] = [];
  let state = start;
  const opened: string[] = [];
  const dispatch = (a: Action) => {
    state = reduce(state, a);
  };
  const host: Host = {
    state: () => state,
    dispatch,
    say: async () => {},
    choose: async (labels) => {
      for (const p of PREFER) {
        const i = labels.indexOf(p);
        if (i >= 0) return i;
      }
      return labels.length - 1;
    },
    concept: async () => {},
    /**
     * The bot cannot press buttons in a React mini-game, so it stands in for a
     * player who played it competently: the concepts that game teaches come
     * back at a mastery target that counts as understood.
     *
     * The map is written out here rather than read from the registry because
     * `core/` must not import `@/games` (the games pull in React). Keeping it
     * local also means this stays a test of whether the *story* is
     * completable; the games have their own tests.
     */
    minigame: async (id) => ({
      choices: [],
      conceptDeltas: Object.fromEntries((MINIGAME_CONCEPTS[id] ?? []).map((c) => [c, 0.9])),
      misconceptions: [],
      summaryKey: `${id}.summary`,
    }),
    quiz: async (ids) =>
      ids.map((id) => {
        const q = quizById(id)!;
        dispatch({ type: 'learn', concept: q.concept, correct: true });
        return { id, correct: true };
      }),
    open: async (panel) => {
      opened.push(panel);
      if (panel === 'shop:zaroorat') {
        for (const item of monthlyNeeds(state)) if (!state.bought.includes(item.id)) dispatch({ type: 'buy', item: item.id, from: state.bank.upi ? 'bank' : 'cash' });
      }
      if (panel === 'bank' && state.cash > 200) dispatch({ type: 'deposit', amount: state.cash - 200 });
      if (panel === 'bonds') dispatch({ type: 'buyBond', amount: 500 });
      if (panel === 'exchange') dispatch({ type: 'buyAsset', asset: 'index', amount: 500 });
    },
    sleep: async () => dispatch({ type: 'advanceMonth' }),
    warp: () => {},
    log: () => {},
    toast: () => {},
    duel: async (id) => {
      duels.push(id);
      return setup.loseDuels ? 'lose' : 'win';
    },
    checkpoint: () => {},
  };
  const run = async (id: string) => runScript(SCRIPTS, id, host);
  const autos = async (map: string) => {
    for (let guard = 0; guard < 10; guard++) {
      const a = pendingAuto(AUTOS, state, map);
      if (!a) return;
      await run(a.script);
    }
    throw new Error('auto script loop');
  };
  /** One month of everyday life: buy needs, do an odd job, bank the cash, try for the goal, sleep. */
  const liveMonth = async () => {
    await autos('paisapur');
    await host.open('shop:zaroorat');
    if (state.chapter >= 2 && !state.flags.goal_done) await run('goal_buy');
    if (state.chapter >= 2) await run('jobs');
    await host.open('bank');
    await run('bed');
    await autos('home');
  };
  return { run, autos, liveMonth, get: () => state, opened, duels };
}

async function playYear(setup: Setup) {
    const b = bot(newLife(42), setup);

    // Prologue
    await b.autos('home');
    expect(b.get().flags.intro_done).toBe(true);
    await b.autos('lab');
    expect(b.get().chapter).toBe(1);
    expect(b.get().cash).toBe(1300);

    // Chapter 1: the bank
    await b.run('meena');
    expect(b.get().flags.need_docs).toBe(true);
    await b.run('mom');
    await b.run('meena');
    expect(b.get().bank.open).toBe(true);
    expect(b.get().bank.upi).toBe(true);
    await b.autos('paisapur');
    expect(b.get().flags.scam_kyc_done).toBe(true);
    await b.run('mom');
    await b.autos('paisapur');
    expect(b.get().flags.collect_done).toBe(true);
    await b.run('meena');
    expect(b.get().badges).toContain('banked');
    expect(b.get().chapter).toBe(2);

    // Chapter 2: two months on a budget
    await b.run('professor');
    await b.liveMonth();
    await b.run('professor');
    expect(b.get().bank.autoSave).toBe(200);
    await b.liveMonth();
    await b.run('anwar');
    expect(b.get().badges).toContain('budget');
    expect(b.get().chapter).toBe(3);

    // Chapter 3: the storm and the emergency fund
    await b.autos('home');
    expect(b.get().flags.phone_cracked).toBe(true);
    await b.run('lakshmi');
    await b.autos('paisapur');
    for (let i = 0; i < 6 && b.get().chapter === 3; i++) {
      await b.run('lakshmi');
      if (b.get().chapter === 3) await b.liveMonth();
    }
    expect(b.get().badges).toContain('saver');

    // Chapter 4: borrowing
    await b.run('professor');
    await b.run('iyer');
    await b.autos('paisapur');
    expect(b.get().flags.call_done).toBe(true);
    await b.run('lender');
    await b.run('loanapp');
    for (let i = 0; i < 2; i++) await b.liveMonth();
    if (!setup.loseDuels) expect(b.get().loans.some((l) => l.kind === 'loanapp')).toBe(false);
    await b.run('iyer');
    expect(b.get().badges).toContain('borrower');

    // Chapter 5: bonds, the bridge, the exchange
    await b.run('professor');
    await b.run('bondclerk');
    expect(b.get().bonds.length).toBe(1);
    await b.liveMonth();
    expect(b.get().flags.bridge_built).toBe(true);
    await b.run('ravi');
    await b.run('ravi');
    for (let i = 0; i < 6 && b.get().chapter === 5; i++) {
      await b.liveMonth();
      await b.run('ravi');
    }
    expect(b.get().badges).toContain('investor');

    // Chapter 6: protect
    await b.run('professor');
    await b.run('jackpot');
    await b.run('insurer');
    expect(b.get().insured).toBe(true);
    await b.autos('paisapur');
    expect(b.get().flags.fire_done).toBe(true);
    await b.run('fatima');
    expect(b.get().badges).toEqual(['banked', 'budget', 'saver', 'borrower', 'investor', 'shield']);
    expect(b.get().flags.game_complete).toBe(true);
    await b.run('professor');
    expect(b.opened).toContain('year');

    return b;
}

const GOALS = Object.keys(GOAL_DEFS) as GoalId[];
const SOURCES: IncomeSource[] = ['allowance', 'tutoring', 'shop'];

describe('a full year in Paisapur', () => {
  for (const goal of GOALS) {
    for (const source of SOURCES) {
      it(`can be finished with goal "${goal}" and income from ${source}`, async () => {
        const b = await playYear({ goal, source });
        const s = b.get();
        expect(s.goal.id === goal || s.goalsDone.includes(goal)).toBe(true);
        // Every scam was a battle, and the bot won them all.
        expect(b.duels).toEqual(['kyc_sms', 'qr_buyer', 'job_task', 'bank_call', 'loan_app', 'jackpot']);
        // Kabir lived the same year with the same goal, the tempting way, and ends up worse off.
        const kabir = simulateKabir(s).state;
        expect(kabir.goal.id).toBe(s.goalsDone[0] ?? s.goal.id);
        expect(netWorth(kabir)).toBeLessThan(netWorth(s));
        // The year taught most of the Journal (some lessons sit behind optional branches).
        expect(Object.keys(s.journal).length).toBeGreaterThan(CONCEPTS.length * 0.75);
      });
    }
  }

  it('small goals are reached by saving alone', async () => {
    for (const goal of ['trip', 'cycle', 'fees'] as GoalId[]) {
      const s = (await playYear({ goal, source: 'allowance' })).get();
      expect(s.goalsDone, `${goal} month ${s.month} pot ${s.pot} bank ${s.bank.balance} cash ${s.cash} goal ${s.goal.id}`).toContain(goal);
      expect(s.flags.goal_on_loan, goal).toBe(false);
    }
  });

  it('a college life gets the scholarship lump sum', async () => {
    const s = (await playYear({ goal: 'laptop', source: 'allowance', stage: 'college' })).get();
    expect(s.flags.scholarship_done).toBe(true);
    expect(s.lifeStage).toBe('college');
  });

  it('can still be finished after losing every scam battle', async () => {
    const b = await playYear({ goal: 'phone', source: 'tutoring', loseDuels: true });
    expect(b.get().badges).toContain('shield');
    expect(b.get().ledger.some((e) => e.reason.startsWith('scam'))).toBe(true);
  });
});
