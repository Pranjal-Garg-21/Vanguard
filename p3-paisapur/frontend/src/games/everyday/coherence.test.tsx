/**
 * Story ↔ game coherence. The story and the mini-games must talk about the
 * same rupees: a game opened inside Paisapur shows the player's real income,
 * needs, goal, prices, spending and lending rates, never a separate table.
 * Each test here pins one place where the two drifted apart before.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  GOAL_DEFS,
  incomeFor,
  monthlyNeeds,
  needsCost,
  newLife,
  priceOf,
  reduce,
  RULES,
  type Action,
  type GoalId,
  type IncomeSource,
  type LifeState,
} from '@/core/engine';
import type { MiniGameResult } from '@/core/types';
import { rupees, t } from '@/platform';
import swipeContent from '@/content/scenarios/plan/swipe-sort.json';
import { contextFromLife, spendingLedger } from '../adapter';
import { billsTotalOf, disposableOf, goalOf, incomeOf, storyPrice } from './shared/economics';
import { historyFor, totalOf } from './spending-detective/logic/history';
import { ladderOptions } from './debt-ladder/logic/ladder';
import { everydayGames } from './registry';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const apply = (s: LifeState, ...a: Action[]) => a.reduce(reduce, s);

/** A player a few months in, with an account, savings and some everyday spending. */
function lived(setup: { goal?: GoalId; source?: IncomeSource; stage?: 'school' | 'college' } = {}): LifeState {
  let s = apply(
    newLife(11),
    { type: 'setup', goal: setup.goal ?? 'phone', source: setup.source ?? 'allowance', lifeStage: setup.stage ?? 'school' },
    { type: 'gain', amount: 1000, reason: 'gift' },
    { type: 'openAccount' },
    { type: 'enableUpi' },
    { type: 'deposit', amount: 1000 },
  );
  for (let m = 0; m < 3; m++) {
    for (const item of monthlyNeeds(s)) s = reduce(s, { type: 'buy', item: item.id, from: 'bank' });
    s = apply(s, { type: 'buy', item: 'chai', from: 'cash' }, { type: 'buy', item: 'snacks', from: 'bank' }, { type: 'advanceMonth' });
  }
  return s;
}

describe('every game sees the story’s own economy', () => {
  for (const stage of ['school', 'college'] as const) {
    for (const source of ['allowance', 'tutoring', 'shop'] as IncomeSource[]) {
      it(`${stage} / ${source}: income, needs and spare money match the story`, () => {
        const life = lived({ stage, source });
        const ctx = contextFromLife(life);
        expect(incomeOf(ctx)).toBe(incomeFor(life, life.month + 1));
        expect(billsTotalOf(ctx)).toBe(needsCost(life));
        expect(disposableOf(ctx)).toBe(Math.max(0, incomeFor(life, life.month + 1) - needsCost(life)));
      });
    }
  }

  it('every story goal reaches the games at the story’s price', () => {
    for (const goal of Object.keys(GOAL_DEFS) as GoalId[]) {
      const life = lived({ goal });
      expect(goalOf(contextFromLife(life)).amount, goal).toBe(life.goal.target);
    }
  });

  it('Swipe Sort prices the shop’s items at the shop’s price', () => {
    const life = lived();
    const ctx = contextFromLife(life);
    const linked = swipeContent.cards.filter((c) => 'storyItem' in c) as { storyItem: string }[];
    expect(linked.length).toBeGreaterThan(3);
    for (const card of linked) {
      const item = monthlyNeeds({ lifeStage: 'college' }).concat(monthlyNeeds(life)).find((i) => i.id === card.storyItem);
      const expected = item ? priceOf(item, life.month) : storyPrice(ctx, card.storyItem);
      expect(storyPrice(ctx, card.storyItem), card.storyItem).toBe(expected);
    }
  });

  it('Spending Detective reads the player’s real spending, grouped and labelled', () => {
    const life = lived();
    const ctx = contextFromLife(life);
    const history = historyFor(ctx);
    // Never the old "everything else ×23" line built from income and deposits.
    expect(history.some((h) => h.textKey === 'sm02.txn.other')).toBe(false);
    for (const line of history) expect(t(line.textKey), line.textKey).not.toBe(line.textKey);
    // What it shows adds up to what was really spent (rounding aside).
    const spent = spendingLedger(life).reduce((sum, e) => sum + e.amount, 0);
    expect(Math.abs(totalOf(history) - spent)).toBeLessThanOrEqual(history.length);
  });

  it('the Debt Ladder charges what the story’s lenders charge', () => {
    const byId = Object.fromEntries(ladderOptions().map((o) => [o.id, o]));
    expect(byId.moneylender!.ratePercent).toBe(RULES.loan.moneylender.monthlyRate * 100);
    expect(byId.bank!.ratePercent).toBe(RULES.loan.bank.monthlyRate * 100);
    expect(byId.loan_app!.feePercent).toBe(RULES.loan.loanapp.feeRate * 100);
    // The Sahukar says the same rate out loud just before the game opens.
    expect(t('story.c4.lender2')).toContain(`${RULES.loan.moneylender.monthlyRate * 100}% a month`);
  });
});

// ── What the player actually reads ──────────────────────────────────────

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const game = (id: string) => everydayGames.find((g) => g.id === id)!;
const mount = (id: string, life: LifeState, params?: Record<string, unknown>) => {
  const Play = game(id).Component;
  act(() => root.render(<Play ctx={contextFromLife(life, { params })} onComplete={(_r: MiniGameResult) => {}} />));
};
const text = () => host.textContent ?? '';
const click = (label: string) => {
  const b = [...host.querySelectorAll('button')].find((x) => x.textContent?.includes(label));
  if (!b) throw new Error(`no button "${label}" in: ${text().slice(0, 200)}`);
  act(() => b.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};

describe('inside the story, the screens show the story’s numbers', () => {
  it('Bank Counter offers the cash the player really has, with the amount filled in', () => {
    const life = apply(newLife(3), { type: 'gain', amount: 1000, reason: 'gift' });
    mount('bank-counter', life);
    click(t('common.continue'));
    click(t('bank02.account.zero_balance.text'));
    click(t('bank02.nominee.mother'));
    click(t('bank02.form.submit'));
    expect(text()).toContain(rupees(life.cash));
    expect(text()).not.toContain('{amount}');
  });

  it('Surprise Month stages the story’s cracked phone at the story’s price', () => {
    mount('surprise-month', lived(), { shock: 'screen', amount: 1500 });
    expect(text()).toContain(rupees(1500));
  });

  it('Jar Split lists the story’s needs at the story’s prices', () => {
    const life = lived();
    mount('jar-split', life);
    for (let i = 0; i < 3 && !text().includes(t('paisapur.item.bus_pass')); i++) {
      const next = [...host.querySelectorAll('button')].find((b) => b.textContent === t('common.continue'));
      if (next) act(() => next.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    }
    const bus = monthlyNeeds(life).find((i) => i.id === 'bus_pass')!;
    expect(text()).toContain(t('paisapur.item.bus_pass'));
    expect(text()).toContain(rupees(priceOf(bus, life.month)));
  });

  it('Goal Builder opens on the player’s own goal and price', () => {
    for (const goal of ['trip', 'fees', 'stall', 'bike'] as GoalId[]) {
      const life = lived({ goal });
      mount('goal-builder', life);
      expect(text(), goal).toContain(rupees(life.goal.target));
      expect(text(), goal).toContain(t(`paisapur.goal.${goal}`));
    }
  });

  it('Rescue Mission is about Kabir when the story says so', () => {
    mount('rescue-mission', lived(), { friend: 'Kabir', amount: 2000, hook: 'ponzi' });
    expect(text()).toContain('Kabir');
    expect(text()).toContain('Double Dhamaka');
    expect(text()).not.toContain('Imran');
  });
});
