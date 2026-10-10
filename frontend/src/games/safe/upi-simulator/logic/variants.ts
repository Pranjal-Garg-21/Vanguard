/**
 * Seeded variants of the UPI scam scripts. Names, item and amount change with
 * the seed so classmates sitting together see different details, but every
 * variant keeps all of its red flags. Pure. Owner: P5.
 */
import { makeRng } from '../../phone/logic/rng';
import type { Scenario } from '../../phone/logic/types';

export const BUYERS = [
  { chat: 'Rahul K.', payee: 'Suresh Traders' },
  { chat: 'Amit S.', payee: 'M. Verma Stores' },
  { chat: 'Neha P.', payee: 'Gupta Enterprises' },
  { chat: 'Karan D.', payee: 'Om Sai Mobiles' },
] as const;

export const ITEMS = ['cricket bat', 'old phone', 'study table', 'bicycle', 'school bag'] as const;

export const inr = (n: number) => n.toLocaleString('en-IN');

export type CollectVariant = { buyer: string; payee: string; item: string; amount: number };

export function pickCollectVariant(seed: number): CollectVariant {
  const rng = makeRng(seed);
  const who = rng.pick(BUYERS);
  return { buyer: who.chat, payee: who.payee, item: rng.pick(ITEMS), amount: rng.int(8, 20) * 100 };
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** The collect-request scam with this seed's details. `balance` carries over from the canteen payment. */
export function collectRequestVariant(template: Scenario, seed: number, balance = 3350): Scenario {
  const v = pickCollectVariant(seed);
  const s = clone(template);
  s.id = `collect_request_${seed}`;
  s.vars = { item: v.item, amount: inr(v.amount), buyer: v.buyer, payee: v.payee };
  s.phone.startBalance = balance;
  for (const step of s.steps) {
    const sf = step.surface;
    if (sf.type === 'chat') sf.from = v.buyer;
    if (sf.type === 'pay-request') {
      sf.fromName = v.payee.toUpperCase();
      sf.amount = v.amount;
      for (const a of sf.actions ?? []) if (a.effects) a.effects = { 'money.bank': -v.amount };
    }
  }
  return s;
}

/** The "scan to receive" QR trick with this seed's amount. */
export function qrReceiveVariant(template: Scenario, seed: number, balance = 3350): Scenario {
  const rng = makeRng(seed + 101);
  const amount = rng.int(5, 15) * 100;
  const s = clone(template);
  s.id = `qr_receive_${seed}`;
  s.vars = { amount: inr(amount) };
  s.phone.startBalance = balance;
  const buyer = rng.pick(BUYERS).chat;
  for (const step of s.steps) {
    const sf = step.surface;
    if (sf.type === 'chat') sf.from = buyer;
    if (sf.type === 'pay-request') {
      sf.fromName = buyer;
      sf.amount = amount;
      for (const a of sf.actions ?? []) if (a.effects) a.effects = { 'money.bank': -amount };
    }
  }
  return s;
}
