import { describe, expect, it } from 'vitest';
import { unsafeText, validateCustom, type CustomDraft, type CustomMessage, type CustomScenarioRow } from '@shared/custom/scenario.ts';
import { buildCustomInbox, splitBody } from './custom';
import { foundTells } from './runner';
import { createRun, reduce } from './runner';
import { scoreRun, summarise } from './scoring';
import type { RunState } from './types';
import { validateScenario } from './validate';

const CONCEPTS = ['fake_kyc', 'red_flags'];

/** A red flag on the first occurrence of `phrase` in `body`. */
const flagOn = (body: string, phrase: string, kind: CustomMessage['flags'][number]['kind'], why: string) => {
  const start = body.indexOf(phrase);
  if (start < 0) throw new Error(`"${phrase}" is not in the body`);
  return { start, end: start + phrase.length, kind, why };
};

const SCAM_BODY = 'Your loan is approved. Pay a fee of Rs 500 today to receive it.';
const scam = (over: Partial<CustomMessage> = {}): CustomMessage => ({
  id: 'a',
  channel: 'sms',
  kind: 'scam',
  from: 'AX-LOANS',
  body: SCAM_BODY,
  flags: [flagOn(SCAM_BODY, 'Pay a fee of Rs 500', 'pulls_money', 'A real loan never asks for a fee first.'), flagOn(SCAM_BODY, 'today', 'urgency', 'The deadline is meant to rush you.')],
  explain: 'A fee before a loan is the classic trick.',
  loss: 500,
  consequence: 'You paid and the loan never came.',
  ...over,
});
const real = (over: Partial<CustomMessage> = {}): CustomMessage => ({
  id: 'b',
  channel: 'chat',
  kind: 'genuine',
  from: 'Teacher Anita',
  body: 'The class photo is on Friday. Wear your uniform.',
  flags: [],
  explain: 'It is from your teacher and asks for nothing.',
  ...over,
});
const draft = (messages: CustomMessage[], over: Partial<CustomDraft> = {}): CustomDraft => ({ title: 'Loan messages', brief: 'Read each message and decide.', concept: 'fake_kyc', body: { v: 1, messages }, ...over });
const row = (messages: CustomMessage[]): CustomScenarioRow => ({ id: 'row1', version: 1, title: 'Loan messages', brief: 'Read each message.', concept: 'fake_kyc', language: 'en', body: { v: 1, messages } });

describe('validating what a facilitator wrote', () => {
  it('accepts a good scenario', () => expect(validateCustom(draft([scam(), real(), real({ id: 'c' })]), CONCEPTS)).toEqual([]));

  it('needs a scam, and a real message once there are three', () => {
    expect(validateCustom(draft([real(), real({ id: 'c' })]), CONCEPTS).join(' ')).toMatch(/at least one scam/i);
    expect(validateCustom(draft([scam(), scam({ id: 'c' }), scam({ id: 'd' })]), CONCEPTS).join(' ')).toMatch(/real message/i);
    expect(validateCustom(draft([scam()]), CONCEPTS).join(' ')).toMatch(/at least 2 messages/i);
  });

  it('needs a red flag on a scam and none on a real message', () => {
    expect(validateCustom(draft([scam({ flags: [] }), real()]), CONCEPTS).join(' ')).toMatch(/no red flag marked/i);
    expect(validateCustom(draft([scam(), real({ flags: [{ start: 0, end: 3, kind: 'urgency', why: 'x' }] })]), CONCEPTS).join(' ')).toMatch(/no red flags/i);
  });

  it('checks red flags point inside the text and do not overlap', () => {
    expect(validateCustom(draft([scam({ flags: [{ start: 0, end: 999, kind: 'urgency', why: 'x' }] }), real()]), CONCEPTS).join(' ')).toMatch(/outside the text/i);
    expect(validateCustom(draft([scam({ flags: [{ start: 0, end: 10, kind: 'urgency', why: 'x' }, { start: 5, end: 15, kind: 'secrecy', why: 'y' }] }), real()]), CONCEPTS).join(' ')).toMatch(/overlap/i);
  });

  it('needs a known skill, and limits lengths and the loss', () => {
    expect(validateCustom(draft([scam(), real()], { concept: 'nope' }), CONCEPTS).join(' ')).toMatch(/what skill/i);
    expect(validateCustom(draft([scam({ body: 'x'.repeat(501), flags: [{ start: 0, end: 1, kind: 'urgency', why: 'x' }] }), real()]), CONCEPTS).join(' ')).toMatch(/too long/i);
    expect(validateCustom(draft([scam({ loss: 999_999 }), real()]), CONCEPTS).join(' ')).toMatch(/loss must be/i);
    expect(validateCustom(draft([scam(), real({ loss: 10 })]), CONCEPTS).join(' ')).toMatch(/only a scam can cost/i);
  });

  it('needs a subject for an email', () => {
    expect(validateCustom(draft([scam({ channel: 'mail' }), real()]), CONCEPTS).join(' ')).toMatch(/subject is empty/i);
  });
});

describe('keeping real people, numbers and websites out', () => {
  it('blocks real web addresses but allows made-up .example ones', () => {
    expect(unsafeText('Visit www.sbi.co.in now')).toMatch(/real website/);
    expect(unsafeText('Open https://paytm.com/refund')).toMatch(/real website/);
    expect(unsafeText('Tap bit.ly/kyc-now')).toMatch(/real website/);
    expect(unsafeText('Go to kyc-update.example/login')).toBeNull();
    expect(unsafeText('Go to http://offer-today.example')).toBeNull();
  });

  it('blocks real emails and long numbers, and allows masked ones', () => {
    expect(unsafeText('Mail me at ramesh@gmail.com')).toMatch(/real email/);
    expect(unsafeText('desk@mail.example')).toBeNull();
    expect(unsafeText('Call 9876543210 now')).toMatch(/real phone/);
    expect(unsafeText('Call +91 98765 43210 now')).toMatch(/real phone/);
    expect(unsafeText('Call 98xxx xx210 now')).toBeNull();
    expect(unsafeText('Pay Rs 25,000 today')).toBeNull();
  });

  it('blocks HTML and does not trip on ordinary sentences', () => {
    expect(unsafeText('<b>Win</b> now')).toMatch(/plain text/i);
    expect(unsafeText('Hello. Please check your account today.')).toBeNull();
    expect(unsafeText('e.g. a fee of 500 rupees')).toBeNull();
  });

  it('shows up as an error when publishing', () => {
    const errors = validateCustom(draft([scam({ body: 'Pay at paytm.com/fee or lose it', flags: [{ start: 0, end: 3, kind: 'urgency', why: 'x' }] }), real()]), CONCEPTS);
    expect(errors.join(' ')).toMatch(/Message 1 text: .*real website/);
  });
});

describe('cutting a message at its red flags', () => {
  it('keeps every character, in order', () => {
    const m = scam();
    expect(splitBody(m).map((p) => p.text).join('')).toBe(m.body);
  });
  it('marks which pieces are flags, whatever order they were added in', () => {
    const [first, second] = scam().flags;
    const pieces = splitBody(scam({ flags: [second!, first!] }));
    expect(pieces.filter((p) => p.flag !== null).map((p) => p.text)).toEqual(['Pay a fee of Rs 500', 'today']);
  });
  it('handles a flag at the very start or end, and a body with no flags', () => {
    expect(splitBody(real()).map((p) => p.flag)).toEqual([null]);
    const edge = scam({ body: 'Urgent: pay', flags: [{ start: 0, end: 6, kind: 'urgency', why: 'x' }, { start: 8, end: 11, kind: 'pulls_money', why: 'y' }] });
    expect(splitBody(edge).map((p) => p.text)).toEqual(['Urgent', ': ', 'pay']);
  });
});

describe('building the script', () => {
  const messages = [scam(), real(), scam({ id: 'm', channel: 'mail', from: 'HR Desk', subject: 'Job confirmed', body: 'Pay a fee to get your job letter.', flags: [flagOn('Pay a fee to get your job letter.', 'fee', 'pulls_money', 'You never pay to get a job.')], loss: undefined, consequence: undefined })];
  const { scenario, strings } = buildCustomInbox(row(messages));

  it('is a valid script', () => expect(validateScenario(scenario)).toEqual([]));

  it('has text for every key it uses', () => {
    const keys = new Set<string>();
    for (const { surface } of scenario.steps) {
      if ('body' in surface) surface.body.forEach((s) => keys.add(s.k));
      for (const l of surface.lens ?? []) keys.add(l.revealKey);
      if (surface.explainKey) keys.add(surface.explainKey);
      if (surface.type === 'mail') keys.add(surface.subjectKey);
    }
    keys.add(scenario.titleKey);
    keys.add(scenario.briefKey);
    for (const k of keys) {
      if (k.startsWith('custom.')) expect(strings[k], k).toBeTruthy();
    }
  });

  it('turns each channel into the right screen, with a made-up email address', () => {
    expect(scenario.steps.map((s) => s.surface.type).filter((t) => t !== 'page')).toEqual(['sms', 'chat', 'mail']);
    const mail = scenario.steps.find((s) => s.id === 'm2')?.surface;
    expect(mail?.type === 'mail' && mail.fromAddress).toBe('hr-desk@mail.example');
  });

  it('lets the Scam Lens find exactly the flagged parts', () => {
    let s: RunState = reduce(createRun(scenario), { type: 'tick', ms: 60_000 });
    for (const l of scenario.steps[0]!.surface.lens ?? []) s = reduce(s, { type: 'inspect', surface: 'm0', lens: l.id });
    expect(foundTells(s, 'm0').sort()).toEqual(['t0', 't1']);
    expect(scenario.steps.find((x) => x.id === 'm1')?.surface.tells).toBeUndefined();
  });

  it('adds a what-would-have-happened card only when the facilitator wrote one', () => {
    expect(scenario.steps.some((s) => s.id === 'm0__whatif')).toBe(true);
    expect(scenario.steps.some((s) => s.id === 'm2__whatif')).toBe(false);
  });

  const respondAll = (choose: (kind: boolean) => string) => {
    let s = reduce(createRun(scenario), { type: 'tick', ms: 60_000 });
    for (const step of scenario.steps.filter((x) => x.surface.respond)) {
      s = reduce(s, { type: 'act', surface: step.id, action: choose(!!step.surface.genuine) });
      s = reduce(s, { type: 'tick', ms: 2000 });
      if (s.inbox.includes(`${step.id}__whatif`)) s = reduce(s, { type: 'act', surface: `${step.id}__whatif`, action: 'continue' });
    }
    return s;
  };

  it('ends once every message is answered, safe if the student blocked scams and opened real ones', () => {
    const s = respondAll((genuine) => (genuine ? 'open' : 'block'));
    expect(s.ended).toBe(true);
    expect(s.outcome).toBe('safe');
    expect(summarise(s).falseAlarms).toBe(0);
    expect(scoreRun(s, 'arcade').conceptDeltas.fake_kyc).toBe(1);
  });

  it('costs the amount the facilitator set when a scam is opened, and counts a blocked real message as a false alarm', () => {
    const lost = respondAll(() => 'open');
    expect(lost.effects['money.bank']).toBe(-500);
    expect(lost.outcome).toBe('fooled');
    expect(summarise(respondAll(() => 'block')).falseAlarms).toBe(1);
  });
});
