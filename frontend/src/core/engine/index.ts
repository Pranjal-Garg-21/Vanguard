/**
 * The money engine for Paisapur: one serialisable state and a pure reducer.
 * The overworld, shops and story never change money directly; they dispatch
 * actions here. Same state + same action = same result. Owner: P2.
 */
import itemsJson from '@/content/paisapur/items.json';
import { ASSETS, priceAt, type AssetId } from '@/core/market';
import { uniform } from '@/core/random';

// ── Types ───────────────────────────────────────────────────────────────

export type LifeStage = 'school' | 'college';
export type IncomeSource = 'allowance' | 'tutoring' | 'shop';
export type GoalId = 'trip' | 'cycle' | 'fees' | 'phone' | 'stall' | 'laptop' | 'bike';
/** What kind of goal it is decides what the story teaches around it. */
export type GoalKind = 'quick' | 'education' | 'asset' | 'consumption';
export type Look = 'player_a' | 'player_b' | 'player_c';
export type PayFrom = 'cash' | 'bank';
export type LoanKind = 'bank' | 'education' | 'moneylender' | 'loanapp' | 'family' | 'card';

export type Item = {
  id: string;
  shop: 'zaroorat' | 'shauq';
  kind: 'need' | 'want';
  /** Price at month 0, GST included. Inflation raises it over the year. */
  price: number;
  /** GST rate in percent, already inside the price. */
  gst: number;
  monthly?: boolean;
  /** Only for this life stage. */
  stage?: LifeStage;
  /** The "original" price a sale sticker claims. */
  was?: number;
  /** Short-lived boost to peace of mind. */
  joy?: number;
  /** Something you keep (it goes in your bag) rather than use up. */
  keep?: boolean;
};

/** Something you own: a kept purchase or a goal item. */
export type Owned = { id: string; month: number; price: number };

export const ITEMS: Item[] = itemsJson.items as Item[];

export type Loan = {
  id: string;
  kind: LoanKind;
  principal: number;
  balance: number;
  monthlyRate: number;
  emi: number;
  monthsLeft: number;
  missed: number;
};

export type Deposit = { id: string; amount: number; ratePa: number; startMonth: number; months: number };
export type Bond = { id: string; amount: number; ratePa: number; startMonth: number; months: number };
export type Holding = { units: number; invested: number };
export type LedgerEntry = { month: number; amount: number; where: PayFrom | 'pot'; reason: string };
export type Mastery = 'seen' | 'mastered';

export type LifeState = {
  v: 1;
  seed: number;
  /** In-game month, 0 = the birthday. */
  month: number;
  chapter: number;
  chapterStartMonth: number;
  look: Look;
  lifeStage: LifeStage;
  source: IncomeSource;
  goal: { id: GoalId; target: number };
  cash: number;
  bank: { open: boolean; balance: number; upi: boolean; autoSave: number; sip: number };
  /** Savings set aside for the goal (inside the bank). */
  pot: number;
  deposits: Deposit[];
  bonds: Bond[];
  loans: Loan[];
  holdings: Partial<Record<AssetId, Holding>>;
  insured: boolean;
  /** The month the player last did an odd job (one per month). */
  workedMonth: number;
  /** null until the first loan or card. */
  creditScore: number | null;
  peace: number;
  safety: number;
  trust: number;
  flags: Record<string, boolean>;
  badges: string[];
  journal: Record<string, Mastery>;
  mastery: Record<string, number>;
  /** Item IDs bought this month. */
  bought: string[];
  ledger: LedgerEntry[];
  objective: string;
  nextId: number;
  /** Goals already reached, in order. */
  goalsDone: GoalId[];
  /** The month each chapter started (so Kabir's life can follow the same calendar). */
  chapterMonths: Record<number, number>;
  /** Income multipliers for particular months (lean months, festival rushes). */
  adjust: Record<number, number>;
  /** End-of-month snapshots for charts and comparisons. */
  history: { month: number; worth: number; debt: number; savings: number }[];
  /** Things you bought and kept (bag), with when and for how much. */
  owned: Owned[];
};

export type Action =
  | { type: 'setup'; look?: Look; lifeStage?: LifeStage; source?: IncomeSource; goal?: GoalId }
  | { type: 'work'; amount: number }
  | { type: 'shock'; amount: number; reason: string }
  | { type: 'setSip'; amount: number }
  | { type: 'gain'; amount: number; reason: string }
  | { type: 'spend'; amount: number; reason: string; from?: PayFrom }
  | { type: 'openAccount' }
  | { type: 'enableUpi' }
  | { type: 'deposit'; amount: number }
  | { type: 'withdraw'; amount: number }
  | { type: 'setAutoSave'; amount: number }
  | { type: 'buy'; item: string; from: PayFrom }
  | { type: 'openDeposit'; amount: number; months: number }
  | { type: 'takeLoan'; kind: LoanKind; amount: number; months: number }
  | { type: 'repayLoan'; id: string; amount: number }
  | { type: 'buyAsset'; asset: AssetId; amount: number }
  | { type: 'sellAsset'; asset: AssetId; units: number }
  | { type: 'buyBond'; amount: number }
  | { type: 'buyInsurance' }
  | { type: 'scamLoss'; amount: number; reason: string }
  | { type: 'meter'; peace?: number; safety?: number; trust?: number }
  | { type: 'flag'; name: string; value?: boolean }
  | { type: 'badge'; id: string }
  | { type: 'chapter'; n: number }
  | { type: 'objective'; key: string }
  | { type: 'seeConcept'; id: string }
  | { type: 'learn'; concept: string; correct: boolean; rate?: number }
  | { type: 'buyGoal'; onCard?: boolean }
  | { type: 'toPot'; amount: number }
  /** Changes income `in` months from now (1 = next month) by `factor`. */
  | { type: 'adjustIncome'; in: number; factor: number }
  | { type: 'advanceMonth' };

// ── Rules (numbers the lessons are built on) ────────────────────────────

export const RULES = {
  savingsRatePa: 0.035,
  depositRatePa: 0.07,
  bondRatePa: 0.08,
  bondMonths: 12,
  /** Prices rise 0.5% a month (about 6% a year). */
  inflationMonthly: 0.005,
  loan: {
    bank: { monthlyRate: 0.01, feeRate: 0.01 },
    education: { monthlyRate: 0.008, feeRate: 0 },
    moneylender: { monthlyRate: 0.05, feeRate: 0 },
    loanapp: { monthlyRate: 0.04, feeRate: 0.2 },
    family: { monthlyRate: 0, feeRate: 0 },
    card: { monthlyRate: 0.035, feeRate: 0 },
  },
  cardMinShare: 0.05,
  cardMinAmount: 100,
  latePenalty: 300,
  insurancePremium: 100,
  /** Peace of mind returns when savings cover this many months of needs. */
  emergencyMonths: 3,
} as const;

export type GoalDef = { target: number; kind: GoalKind; /** Who sells it in the story. */ where: 'shauq' | 'anwar' | 'mom' };

export const GOAL_DEFS: Record<GoalId, GoalDef> = {
  trip: { target: 2500, kind: 'quick', where: 'mom' },
  cycle: { target: 3500, kind: 'quick', where: 'shauq' },
  fees: { target: 5000, kind: 'education', where: 'mom' },
  phone: { target: 8000, kind: 'consumption', where: 'shauq' },
  stall: { target: 10000, kind: 'asset', where: 'anwar' },
  laptop: { target: 25000, kind: 'education', where: 'shauq' },
  bike: { target: 30000, kind: 'consumption', where: 'shauq' },
};

export const GOALS: Record<GoalId, number> = Object.fromEntries(Object.entries(GOAL_DEFS).map(([k, v]) => [k, v.target])) as Record<GoalId, number>;

/** Extra monthly income from a market stall once you own one. */
export const STALL_INCOME = 600;

// ── Helpers ─────────────────────────────────────────────────────────────

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const rupees = (n: number) => Math.round(n);

/** Item price this month: the base price grown by inflation. */
export function priceOf(item: Item, month: number): number {
  return rupees(item.price * (1 + RULES.inflationMonthly) ** month);
}

/** The GST inside a price. */
export function gstIn(price: number, rate: number): number {
  return rupees(price - price / (1 + rate / 100));
}

export function itemById(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

/** This player's monthly needs list. */
export function monthlyNeeds(state: Pick<LifeState, 'lifeStage'>): Item[] {
  return ITEMS.filter((i) => i.monthly && (!i.stage || i.stage === state.lifeStage));
}

export function needsCost(state: LifeState): number {
  return monthlyNeeds(state).reduce((sum, i) => sum + priceOf(i, state.month), 0);
}

export function needsBought(state: LifeState): boolean {
  return monthlyNeeds(state).every((i) => state.bought.includes(i.id));
}

/** EMI for a loan of `principal` at `monthlyRate` over `months`. */
export function emi(principal: number, monthlyRate: number, months: number): number {
  if (months <= 0) return principal;
  if (monthlyRate === 0) return rupees(principal / months);
  const f = (1 + monthlyRate) ** months;
  return rupees((principal * monthlyRate * f) / (f - 1));
}

/** Total you pay back for a loan, including any upfront fee. */
export function totalCost(kind: LoanKind, amount: number, months: number): { emi: number; total: number; received: number; interest: number } {
  const rule = RULES.loan[kind];
  const received = rupees(amount * (1 - rule.feeRate));
  const e = emi(amount, rule.monthlyRate, months);
  const total = e * months;
  return { emi: e, total, received, interest: total - received };
}

/** Months to clear a card balance paying only the minimum each month (capped at 600). */
export function monthsAtMinimum(balance: number): { months: number; paid: number } {
  let b = balance;
  let months = 0;
  let paid = 0;
  while (b > 0.5 && months < 600) {
    b += b * RULES.loan.card.monthlyRate;
    const pay = Math.min(b, Math.max(RULES.cardMinAmount, b * RULES.cardMinShare));
    b -= pay;
    paid += pay;
    months++;
  }
  return { months, paid: rupees(paid) };
}

/** Value of what you hold this month. */
export function holdingsValue(state: LifeState): number {
  let total = 0;
  for (const a of ASSETS) {
    const h = state.holdings[a.id];
    if (h) total += h.units * priceAt(state.seed, a.id, state.month);
  }
  return rupees(total);
}

export function depositValue(d: Deposit | Bond, month: number): number {
  const elapsed = Math.min(d.months, Math.max(0, month - d.startMonth));
  return rupees(d.amount * (1 + d.ratePa / 12) ** elapsed);
}

export function debtTotal(state: LifeState): number {
  return rupees(state.loans.reduce((s, l) => s + l.balance, 0));
}

/** Everything you own minus everything you owe. */
export function netWorth(state: LifeState): number {
  const deposits = state.deposits.reduce((s, d) => s + depositValue(d, state.month), 0);
  const bonds = state.bonds.reduce((s, b) => s + depositValue(b, state.month), 0);
  return rupees(state.cash + state.bank.balance + state.pot + deposits + bonds + holdingsValue(state) - debtTotal(state));
}

/** Money you could reach quickly in an emergency. */
export function emergencyFund(state: LifeState): number {
  return state.bank.balance + state.pot;
}

export function hasEmergencyFund(state: LifeState): boolean {
  return emergencyFund(state) >= RULES.emergencyMonths * needsCost(state);
}

/** Expected income for a month (before it is paid). */
export function incomeFor(state: LifeState, month: number): number {
  const scale = (state.lifeStage === 'college' ? 1.5 : 1) * (state.adjust?.[month] ?? 1);
  const stall = state.flags.stall ? STALL_INCOME : 0;
  if (state.source === 'allowance') return rupees(1500 * scale) + stall;
  if (state.source === 'tutoring') {
    // Irregular: some months have more students than others.
    return rupees((1000 + 1400 * uniform(state.seed, 'tutoring', month)) * scale) + stall;
  }
  // Family shop: festival months are good, monsoon months are lean.
  const seasonal = [1, 1, 0.7, 0.7, 1, 1.3, 1, 0.8, 1.4, 1.2, 1, 1.1, 1][month % 13] ?? 1;
  return rupees(1600 * seasonal * scale) + stall;
}

function ledger(s: LifeState, amount: number, where: LedgerEntry['where'], reason: string): void {
  s.ledger.push({ month: s.month, amount: rupees(amount), where, reason });
  if (s.ledger.length > 300) s.ledger.splice(0, s.ledger.length - 300);
}

function newId(s: LifeState, prefix: string): string {
  s.nextId += 1;
  return `${prefix}${s.nextId}`;
}

/** Loans from banks and cards are reported to the credit bureau; the rest aren't. */
const isFormal = (kind: LoanKind) => kind === 'bank' || kind === 'education' || kind === 'card';

/** Pays from the chosen place. Returns false (and changes nothing) if there isn't enough. */
function pay(s: LifeState, amount: number, from: PayFrom, reason: string): boolean {
  if (amount <= 0) return true;
  if (from === 'bank') {
    if (!s.bank.open || s.bank.balance < amount) return false;
    s.bank.balance -= amount;
  } else {
    if (s.cash < amount) return false;
    s.cash -= amount;
  }
  ledger(s, -amount, from, reason);
  return true;
}

/** Pays from the bank first, then cash. Returns the amount it could not pay. */
function payAnyhow(s: LifeState, amount: number, reason: string): number {
  let left = amount;
  if (s.bank.open && s.bank.balance > 0) {
    const fromBank = Math.min(s.bank.balance, left);
    s.bank.balance -= fromBank;
    left -= fromBank;
    ledger(s, -fromBank, 'bank', reason);
  }
  if (left > 0 && s.cash > 0) {
    const fromCash = Math.min(s.cash, left);
    s.cash -= fromCash;
    left -= fromCash;
    ledger(s, -fromCash, 'cash', reason);
  }
  return left;
}

function receive(s: LifeState, amount: number, reason: string): void {
  if (s.bank.open) {
    s.bank.balance += amount;
    ledger(s, amount, 'bank', reason);
  } else {
    s.cash += amount;
    ledger(s, amount, 'cash', reason);
  }
}

// ── State ───────────────────────────────────────────────────────────────

export function newLife(seed: number): LifeState {
  return {
    v: 1,
    seed,
    month: 0,
    chapter: 0,
    chapterStartMonth: 0,
    look: 'player_a',
    lifeStage: 'school',
    source: 'allowance',
    goal: { id: 'phone', target: GOALS.phone },
    cash: 300,
    bank: { open: false, balance: 0, upi: false, autoSave: 0, sip: 0 },
    pot: 0,
    deposits: [],
    bonds: [],
    loans: [],
    holdings: {},
    insured: false,
    workedMonth: -1,
    creditScore: null,
    peace: 70,
    safety: 60,
    trust: 60,
    flags: {},
    badges: [],
    journal: {},
    mastery: {},
    bought: [],
    ledger: [],
    objective: 'objective.meet_prof',
    nextId: 0,
    goalsDone: [],
    chapterMonths: { 0: 0 },
    adjust: {},
    history: [],
    owned: [],
  };
}

/**
 * Roughly what a thing you own would sell for now. Goods become "second-hand"
 * the moment they leave the shop (−15%), then lose about 2% a month. A stall
 * holds its value better; a trip or course fees can't be resold at all.
 */
export function resaleValue(o: Owned, month: number): number {
  if (o.id === 'goal:trip' || o.id === 'goal:fees') return 0;
  const [firstDrop, monthly] = o.id === 'goal:stall' ? [0.05, 0.005] : [0.15, 0.02];
  return rupees(o.price * (1 - firstDrop) * (1 - monthly) ** Math.max(0, month - o.month));
}

/** Fills in fields added after a save was made, so old saves keep working. */
export function normalize(state: LifeState): LifeState {
  const fresh = newLife(state.seed);
  return {
    ...fresh,
    ...state,
    bank: { ...fresh.bank, ...state.bank },
    goal: GOAL_DEFS[state.goal?.id] ? state.goal : fresh.goal,
  };
}

/** Everything you could put towards your goal today. */
export function goalFunds(state: LifeState): number {
  return state.pot + state.bank.balance + state.cash;
}

/** Why an action can't happen right now (a translation key), or null if it can. */
export function check(state: LifeState, action: Action): string | null {
  switch (action.type) {
    case 'spend':
      return (action.from === 'bank' ? state.bank.balance : state.cash) < action.amount ? 'errors.not_enough' : null;
    case 'deposit':
      if (!state.bank.open) return 'errors.no_account';
      return action.amount <= 0 || state.cash < action.amount ? 'errors.not_enough_cash' : null;
    case 'withdraw':
      if (!state.bank.open) return 'errors.no_account';
      return action.amount <= 0 || state.bank.balance < action.amount ? 'errors.not_enough_bank' : null;
    case 'buy': {
      const item = itemById(action.item);
      if (!item) return 'errors.unknown';
      if (action.from === 'bank' && !state.bank.upi) return 'errors.no_upi';
      const price = priceOf(item, state.month);
      return (action.from === 'bank' ? state.bank.balance : state.cash) < price ? 'errors.not_enough' : null;
    }
    case 'openDeposit':
      if (!state.bank.open) return 'errors.no_account';
      return action.amount < 500 ? 'errors.min_500' : state.bank.balance < action.amount ? 'errors.not_enough_bank' : null;
    case 'takeLoan':
      if ((action.kind === 'bank' || action.kind === 'education' || action.kind === 'card') && !state.bank.open) return 'errors.no_account';
      if (action.kind === 'bank' && state.creditScore !== null && state.creditScore < 600) return 'errors.bad_credit';
      if (action.kind === 'bank' && state.loans.some((l) => l.kind === 'bank')) return 'errors.one_loan';
      return action.amount <= 0 ? 'errors.unknown' : null;
    case 'repayLoan': {
      const loan = state.loans.find((l) => l.id === action.id);
      if (!loan) return 'errors.unknown';
      return state.bank.balance + state.cash < action.amount ? 'errors.not_enough' : null;
    }
    case 'buyAsset':
      if (!state.bank.open) return 'errors.no_account';
      return action.amount < 100 ? 'errors.min_100' : state.bank.balance < action.amount ? 'errors.not_enough_bank' : null;
    case 'sellAsset': {
      const h = state.holdings[action.asset];
      return !h || h.units < action.units - 1e-9 || action.units <= 0 ? 'errors.unknown' : null;
    }
    case 'buyBond':
      if (!state.bank.open) return 'errors.no_account';
      return action.amount < 500 ? 'errors.min_500' : state.bank.balance < action.amount ? 'errors.not_enough_bank' : null;
    case 'buyInsurance':
      return state.insured ? 'errors.already' : !state.bank.open ? 'errors.no_account' : null;
    case 'buyGoal':
      if (state.flags.goal_done) return 'errors.already';
      if (action.onCard) return state.bank.open ? null : 'errors.no_account';
      return goalFunds(state) < state.goal.target ? 'errors.not_enough' : null;
    case 'toPot':
      return action.amount <= 0 || state.cash + state.bank.balance < action.amount ? 'errors.not_enough' : null;
    case 'setAutoSave':
    case 'setSip':
      return !state.bank.open ? 'errors.no_account' : null;
    case 'work':
      return state.workedMonth === state.month ? 'errors.worked' : null;
    default:
      return null;
  }
}

/** Applies an action. Invalid actions return the state unchanged (check() says why). */
export function reduce(state: LifeState, action: Action): LifeState {
  if (check(state, action)) return state;
  const s: LifeState = structuredClone(state);

  switch (action.type) {
    case 'setup':
      if (action.look) s.look = action.look;
      if (action.lifeStage) s.lifeStage = action.lifeStage;
      if (action.source) s.source = action.source;
      if (action.goal) {
        s.goal = { id: action.goal, target: GOAL_DEFS[action.goal].target };
        s.flags.goal_done = false;
      }
      return s;
    case 'buyGoal': {
      if (action.onCard) {
        // Bought on a credit card: the goal now, the bill later.
        s.loans.push({ id: newId(s, 'ln'), kind: 'card', principal: s.goal.target, balance: s.goal.target, monthlyRate: RULES.loan.card.monthlyRate, emi: 0, monthsLeft: 0, missed: 0 });
        if (s.creditScore === null) s.creditScore = 650;
        s.flags.goal_done = true;
        s.flags.goal_on_loan = true;
        if (!s.goalsDone.includes(s.goal.id)) s.goalsDone.push(s.goal.id);
        s.owned = [...(s.owned ?? []), { id: `goal:${s.goal.id}`, month: s.month, price: s.goal.target }];
        if (s.goal.id === 'stall') s.flags.stall = true;
        s.peace = clamp(s.peace + 10);
        return s;
      }
      // Goal pot first, then the bank, then cash.
      let left = s.goal.target;
      const fromPot = Math.min(s.pot, left);
      s.pot -= fromPot;
      left -= fromPot;
      if (fromPot) ledger(s, -fromPot, 'pot', `goal:${s.goal.id}`);
      payAnyhow(s, left, `goal:${s.goal.id}`);
      s.flags.goal_done = true;
      s.flags.goal_on_loan = s.loans.some((l) => l.kind !== 'family');
      if (!s.goalsDone.includes(s.goal.id)) s.goalsDone.push(s.goal.id);
      s.owned = [...(s.owned ?? []), { id: `goal:${s.goal.id}`, month: s.month, price: s.goal.target }];
      if (s.goal.id === 'stall') s.flags.stall = true;
      s.peace = clamp(s.peace + 15);
      return s;
    }
    case 'adjustIncome':
      s.adjust = { ...s.adjust, [s.month + action.in]: action.factor };
      return s;
    case 'toPot': {
      const fromCash = Math.min(s.cash, action.amount);
      s.cash -= fromCash;
      s.bank.balance -= action.amount - fromCash;
      if (fromCash) ledger(s, -fromCash, 'cash', 'autosave');
      if (action.amount - fromCash) ledger(s, -(action.amount - fromCash), 'bank', 'autosave');
      s.pot += action.amount;
      ledger(s, action.amount, 'pot', 'autosave');
      return s;
    }
    case 'work':
      s.workedMonth = s.month;
      s.cash += rupees(action.amount);
      ledger(s, action.amount, 'cash', 'work');
      return s;
    case 'shock':
      payAnyhow(s, rupees(action.amount), action.reason);
      s.peace = clamp(s.peace - 10);
      return s;
    case 'setSip':
      s.bank.sip = Math.max(0, rupees(action.amount));
      return s;
    case 'gain':
      s.cash += rupees(action.amount);
      ledger(s, action.amount, 'cash', action.reason);
      return s;
    case 'spend':
      pay(s, rupees(action.amount), action.from ?? 'cash', action.reason);
      return s;
    case 'openAccount':
      s.bank.open = true;
      return s;
    case 'enableUpi':
      s.bank.upi = true;
      return s;
    case 'deposit':
      s.cash -= action.amount;
      s.bank.balance += action.amount;
      ledger(s, -action.amount, 'cash', 'deposit');
      ledger(s, action.amount, 'bank', 'deposit');
      return s;
    case 'withdraw':
      s.bank.balance -= action.amount;
      s.cash += action.amount;
      ledger(s, -action.amount, 'bank', 'withdraw');
      ledger(s, action.amount, 'cash', 'withdraw');
      return s;
    case 'setAutoSave':
      s.bank.autoSave = Math.max(0, rupees(action.amount));
      return s;
    case 'buy': {
      const item = itemById(action.item)!;
      pay(s, priceOf(item, s.month), action.from, `buy:${item.id}`);
      if (!s.bought.includes(item.id)) s.bought.push(item.id);
      if (item.keep) s.owned = [...(s.owned ?? []), { id: item.id, month: s.month, price: priceOf(item, s.month) }];
      if (item.joy) s.peace = clamp(s.peace + item.joy);
      return s;
    }
    case 'openDeposit':
      s.bank.balance -= action.amount;
      s.deposits.push({ id: newId(s, 'fd'), amount: action.amount, ratePa: RULES.depositRatePa, startMonth: s.month, months: action.months });
      ledger(s, -action.amount, 'bank', 'fd_open');
      return s;
    case 'takeLoan': {
      const rule = RULES.loan[action.kind];
      const received = rupees(action.amount * (1 - rule.feeRate));
      const months = action.kind === 'card' ? 0 : action.months;
      const e = action.kind === 'card' ? 0 : emi(action.amount, rule.monthlyRate, months);
      s.loans.push({
        id: newId(s, 'ln'),
        kind: action.kind,
        principal: action.amount,
        balance: action.amount,
        monthlyRate: rule.monthlyRate,
        emi: e,
        monthsLeft: months,
        missed: 0,
      });
      if (isFormal(action.kind) && s.creditScore === null) s.creditScore = 650;
      if (action.kind !== 'card') receive(s, received, `loan:${action.kind}`);
      if (action.kind === 'loanapp') s.safety = clamp(s.safety - 15);
      if (action.kind === 'family') s.trust = clamp(s.trust - 5);
      return s;
    }
    case 'repayLoan': {
      const loan = s.loans.find((l) => l.id === action.id)!;
      const amount = Math.min(action.amount, rupees(loan.balance));
      payAnyhow(s, amount, `repay:${loan.kind}`);
      loan.balance -= amount;
      if (loan.balance <= 0.5) {
        s.loans = s.loans.filter((l) => l.id !== loan.id);
        if (loan.kind === 'family') s.trust = clamp(s.trust + 10);
      } else if (loan.monthsLeft > 0) {
        loan.emi = emi(loan.balance, loan.monthlyRate, loan.monthsLeft);
      }
      return s;
    }
    case 'buyAsset': {
      const price = priceAt(s.seed, action.asset, s.month);
      const h = s.holdings[action.asset] ?? { units: 0, invested: 0 };
      h.units += action.amount / price;
      h.invested += action.amount;
      s.holdings[action.asset] = h;
      s.bank.balance -= action.amount;
      ledger(s, -action.amount, 'bank', `invest:${action.asset}`);
      return s;
    }
    case 'sellAsset': {
      const price = priceAt(s.seed, action.asset, s.month);
      const h = s.holdings[action.asset]!;
      const units = Math.min(h.units, action.units);
      const share = units / h.units;
      const proceeds = rupees(units * price);
      h.invested -= h.invested * share;
      h.units -= units;
      if (h.units < 1e-6) delete s.holdings[action.asset];
      s.bank.balance += proceeds;
      ledger(s, proceeds, 'bank', `sell:${action.asset}`);
      return s;
    }
    case 'buyBond':
      s.bank.balance -= action.amount;
      s.bonds.push({ id: newId(s, 'bd'), amount: action.amount, ratePa: RULES.bondRatePa, startMonth: s.month, months: RULES.bondMonths });
      ledger(s, -action.amount, 'bank', 'bond_buy');
      return s;
    case 'buyInsurance':
      s.insured = true;
      return s;
    case 'scamLoss': {
      payAnyhow(s, rupees(action.amount), action.reason);
      s.safety = clamp(s.safety - 20);
      s.peace = clamp(s.peace - 15);
      return s;
    }
    case 'meter':
      s.peace = clamp(s.peace + (action.peace ?? 0));
      s.safety = clamp(s.safety + (action.safety ?? 0));
      s.trust = clamp(s.trust + (action.trust ?? 0));
      return s;
    case 'flag':
      s.flags[action.name] = action.value ?? true;
      return s;
    case 'badge':
      if (!s.badges.includes(action.id)) s.badges.push(action.id);
      return s;
    case 'chapter':
      s.chapter = action.n;
      s.chapterStartMonth = s.month;
      s.chapterMonths = { ...s.chapterMonths, [action.n]: s.month };
      return s;
    case 'objective':
      s.objective = action.key;
      return s;
    case 'seeConcept':
      if (!s.journal[action.id]) s.journal[action.id] = 'seen';
      return s;
    case 'learn': {
      const rate = action.rate ?? 0.3;
      const m = s.mastery[action.concept] ?? 0;
      const next = m + rate * ((action.correct ? 1 : 0) - m);
      s.mastery[action.concept] = Math.round(next * 1000) / 1000;
      s.journal[action.concept] = next >= 0.7 ? 'mastered' : 'seen';
      return s;
    }
    case 'advanceMonth':
      return advanceMonth(s);
  }
}

/** Ends the month: needs check, income, saving, interest, deposits, loans, peace of mind. */
function advanceMonth(s: LifeState): LifeState {
  // 1. Needs you didn't buy hurt.
  s.flags.missed_needs = !needsBought(s);
  if (s.flags.missed_needs) s.peace = clamp(s.peace - 15);

  s.month += 1;
  s.bought = [];

  // 2. Income arrives.
  receive(s, incomeFor(s, s.month), 'income');

  // 3. Pay yourself first: the standing instruction moves money to the goal pot.
  if (s.bank.open && s.bank.autoSave > 0) {
    const amount = Math.min(s.bank.autoSave, s.bank.balance);
    if (amount > 0) {
      s.bank.balance -= amount;
      s.pot += amount;
      ledger(s, -amount, 'bank', 'autosave');
      ledger(s, amount, 'pot', 'autosave');
    }
  }

  // 3b. SIP: a fixed amount into the index fund, whatever the market is doing.
  if (s.bank.open && s.bank.sip > 0 && s.bank.balance >= s.bank.sip) {
    const price = priceAt(s.seed, 'index', s.month);
    const h = s.holdings.index ?? { units: 0, invested: 0 };
    h.units += s.bank.sip / price;
    h.invested += s.bank.sip;
    s.holdings.index = h;
    s.bank.balance -= s.bank.sip;
    ledger(s, -s.bank.sip, 'bank', 'invest:sip');
  }

  // 4. Savings interest (monthly, on the bank balance and the goal pot).
  if (s.bank.open) {
    const interest = rupees((s.bank.balance + s.pot) * (RULES.savingsRatePa / 12));
    if (interest > 0) {
      s.bank.balance += interest;
      ledger(s, interest, 'bank', 'interest');
    }
  }

  // 5. Fixed deposits and bonds that mature come back with interest.
  for (const d of s.deposits.filter((d) => s.month - d.startMonth >= d.months)) {
    const value = depositValue(d, s.month);
    s.bank.balance += value;
    ledger(s, value, 'bank', 'fd_mature');
  }
  s.deposits = s.deposits.filter((d) => s.month - d.startMonth < d.months);
  for (const b of s.bonds.filter((b) => s.month - b.startMonth >= b.months)) {
    const value = depositValue(b, s.month);
    s.bank.balance += value;
    ledger(s, value, 'bank', 'bond_mature');
  }
  s.bonds = s.bonds.filter((b) => s.month - b.startMonth < b.months);

  // 6. Loans: interest, then the EMI (or the card's minimum payment).
  for (const loan of s.loans) {
    const interest = loan.balance * loan.monthlyRate;
    loan.balance += interest;
    const due =
      loan.kind === 'card'
        ? Math.min(loan.balance, Math.max(RULES.cardMinAmount, loan.balance * RULES.cardMinShare))
        : Math.min(loan.emi, loan.balance);
    const unpaid = payAnyhow(s, rupees(due), `emi:${loan.kind}`);
    loan.balance -= rupees(due) - unpaid;
    if (unpaid > 0) {
      loan.missed += 1;
      loan.balance += RULES.latePenalty;
      ledger(s, -RULES.latePenalty, 'bank', `late_fee:${loan.kind}`);
      s.peace = clamp(s.peace - (loan.kind === 'loanapp' ? 25 : 15));
      if (loan.kind === 'loanapp') s.flags.harassed = true;
      if (isFormal(loan.kind) && s.creditScore !== null) s.creditScore = Math.max(300, s.creditScore - 60);
    } else {
      if (loan.monthsLeft > 0) loan.monthsLeft -= 1;
      if (isFormal(loan.kind) && s.creditScore !== null) s.creditScore = Math.min(900, s.creditScore + 10);
    }
  }
  s.loans = s.loans.filter((l) => l.balance > 0.5);

  // 7. Insurance premium.
  if (s.insured) {
    const unpaid = payAnyhow(s, RULES.insurancePremium, 'premium');
    if (unpaid > 0) s.insured = false;
  }

  // 8. Peace of mind drifts towards calm when there is a safety net, and away under bad debt.
  if (hasEmergencyFund(s)) s.peace = clamp(s.peace + 5);
  if (s.loans.some((l) => l.kind === 'loanapp' || l.kind === 'moneylender')) s.peace = clamp(s.peace - 5);
  s.flags.overwhelmed = s.peace <= 0;

  s.history = [...(s.history ?? []), { month: s.month, worth: netWorth(s), debt: debtTotal(s), savings: emergencyFund(s) }].slice(-36);
  return s;
}

/** Ledger entries for one month, grouped by reason (for the night summary). */
export function monthSummary(state: LifeState, month: number): { reason: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const e of state.ledger) {
    if (e.month !== month || e.reason === 'deposit' || e.reason === 'withdraw' || e.reason === 'autosave') continue;
    const reason = e.reason.split(':')[0]!;
    totals.set(reason, (totals.get(reason) ?? 0) + e.amount);
  }
  return [...totals.entries()].map(([reason, amount]) => ({ reason, amount })).filter((r) => r.amount !== 0);
}
