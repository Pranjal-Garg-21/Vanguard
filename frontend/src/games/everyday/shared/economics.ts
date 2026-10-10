/**
 * The character's money, as the Everyday Money games need it. Pure. Owner: P3.
 *
 * TODO(P1): `generateInitialState(persona, seed)` is the real source of these
 * numbers (§7.5). Until it lands, these games fall back to the §7.5 table so
 * they can be played in the Arcade. Whenever the runtime passes a real
 * `stateSlice` — which LifePath always will — that wins.
 *
 * ONE DELIBERATE DEPARTURE from §7.5, flagged for P1. The table adds household
 * support as a flat ₹1,000–3,000 commitment, but applies it to incomes that
 * differ by 15×. A school student on a ₹800 allowance with ₹350 of needs plus a
 * flat ₹1,000 share starts at about −₹550 a month, before anything happens —
 * an unplayable state from month zero. Here the contribution is a share of
 * income instead, so a contributor's needs land near the ~80% the plan expects
 * (§12.6 UC-PB-02) without going negative.
 */

import type { MiniGameContext, Persona } from '@/core/types';

export type IncomeRegularity = 'fixed' | 'irregular' | 'seasonal';

export type CharacterIncome = {
  amount: number;
  regularity: IncomeRegularity;
};

export type Bill = {
  id: string;
  textKey: string;
  amount: number;
};

export type CharacterGoal = {
  id: string;
  textKey: string;
  amount: number;
};

type PersonaFields = {
  lifeStage?: string;
  circumstance?: string;
  goal?: string;
  age?: number;
};

const read = (persona: Persona): PersonaFields => persona as PersonaFields;

/** Round to the nearest ₹50, so L1 coin counting stays possible. */
const toCoins = (amount: number) => Math.round(amount / 50) * 50;

/** §7.5, by life stage and where the money comes from. */
export function characterIncome(persona: Persona): CharacterIncome {
  const { lifeStage, circumstance } = read(persona);

  if (circumstance === 'young_entrepreneur') {
    return { amount: 4000, regularity: 'irregular' };
  }
  switch (lifeStage) {
    case 'school_student':
      return circumstance === 'part_time_earner'
        ? { amount: 1500, regularity: 'irregular' }
        : { amount: 800, regularity: 'fixed' };
    case 'college_student':
      return circumstance === 'part_time_earner'
        ? { amount: 3750, regularity: 'irregular' }
        : { amount: 3500, regularity: 'seasonal' };
    default:
      return { amount: 12000, regularity: 'fixed' };
  }
}

/**
 * The known bills for the month, itemised. They attach to the Needs jar, and
 * under-funding it names the one that will not be paid.
 */
export function characterBills(persona: Persona): Bill[] {
  const { lifeStage, circumstance } = read(persona);
  const bills: Bill[] = [];

  // Circumstance is checked before life stage, exactly as characterIncome
  // does. A character running a family shop earns and spends on that shop
  // whatever their age, and keying the two functions differently once gave an
  // entrepreneur a first-earner's bills against a shopkeeper's income.
  if (circumstance === 'young_entrepreneur') {
    bills.push({ id: 'materials', textKey: 'pb02.bill.materials', amount: 900 });
    bills.push({ id: 'transport', textKey: 'pb02.bill.transport', amount: 600 });
  } else if (lifeStage === 'school_student') {
    bills.push({ id: 'bus_pass', textKey: 'pb02.bill.bus_pass', amount: 300 });
    bills.push({ id: 'recharge', textKey: 'pb02.bill.recharge', amount: 50 });
  } else if (lifeStage === 'college_student') {
    bills.push({ id: 'mess', textKey: 'pb02.bill.mess', amount: 1800 });
    bills.push({ id: 'transport', textKey: 'pb02.bill.transport', amount: 400 });
  } else {
    bills.push({ id: 'rent_share', textKey: 'pb02.bill.rent_share', amount: 3000 });
    bills.push({ id: 'food', textKey: 'pb02.bill.food', amount: 2300 });
    bills.push({ id: 'transport', textKey: 'pb02.bill.transport', amount: 1200 });
  }

  // See the header: a share of income, not a flat amount.
  if (circumstance === 'family_contributor') {
    const share = toCoins(characterIncome(persona).amount * 0.3);
    bills.push({ id: 'household', textKey: 'pb02.bill.household', amount: share });
  }

  return bills;
}

export const billsTotalFor = (persona: Persona) =>
  characterBills(persona).reduce((total, bill) => total + bill.amount, 0);

/** §7.5 goal amounts. */
const GOALS: Record<string, CharacterGoal> = {
  laptop: { id: 'laptop', textKey: 'goal.laptop', amount: 25000 },
  coaching: { id: 'coaching', textKey: 'goal.coaching', amount: 6000 },
  bike: { id: 'bike', textKey: 'goal.bike', amount: 30000 },
  business: { id: 'business', textKey: 'goal.business', amount: 10000 },
  family: { id: 'family', textKey: 'goal.family', amount: 8000 },
  phone: { id: 'phone', textKey: 'goal.phone', amount: 8000 },
};

export function characterGoal(persona: Persona): CharacterGoal {
  const { goal, lifeStage, circumstance } = read(persona);
  const chosen = goal ? GOALS[goal] : undefined;
  if (chosen) return chosen;

  // A sensible default per character, so the Arcade always has a goal.
  if (circumstance === 'young_entrepreneur') return GOALS.business!;
  if (circumstance === 'family_contributor') return GOALS.family!;
  if (lifeStage === 'school_student') return GOALS.phone!;
  if (lifeStage === 'first_earner') return GOALS.bike!;
  return GOALS.laptop!;
}

/** What is left after the known bills — what the Wants and Future jars share. */
export function disposableIncome(persona: Persona): number {
  return Math.max(0, characterIncome(persona).amount - billsTotalFor(persona));
}

/**
 * Prefer the real state when the runtime gives us one; fall back to the
 * persona defaults in the Arcade.
 */
export function incomeFromContext(ctx: MiniGameContext): number {
  const slice = ctx.stateSlice as { money?: { monthlyIncome?: { amount?: number } } };
  const fromState = slice?.money?.monthlyIncome?.amount;
  return typeof fromState === 'number' ? fromState : characterIncome(ctx.persona).amount;
}
