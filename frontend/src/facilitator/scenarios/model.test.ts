import { describe, expect, it } from 'vitest';
import { fromInbox, occurrenceAt, rangesFor, toInbox, blankMessage, type EditorMessage } from './model';

const message = (over: Partial<EditorMessage> = {}): EditorMessage => ({
  ...blankMessage('scam'),
  from: 'AX-TEST',
  body: 'Pay now. Pay later is not allowed. Pay now!',
  explain: 'A scam.',
  ...over,
});

describe('marked words and where they are', () => {
  it('finds the first and later occurrences of the same words', () => {
    const body = 'Pay now. Pay later. Pay now!';
    expect(rangesFor(body, [{ text: 'Pay now', occurrence: 0, kind: 'urgency', why: 'x' }]).found[0]).toMatchObject({ start: 0, end: 7 });
    expect(rangesFor(body, [{ text: 'Pay now', occurrence: 1, kind: 'urgency', why: 'x' }]).found[0]).toMatchObject({ start: 20, end: 27 });
  });

  it('works out which occurrence was selected', () => {
    const body = 'Pay now. Pay later. Pay now!';
    expect(occurrenceAt(body, 'Pay now', 0)).toBe(0);
    expect(occurrenceAt(body, 'Pay now', 20)).toBe(1);
  });

  it('keeps a flag on its words when the text before it changes', () => {
    const before = message({ flags: [{ text: 'Pay now', occurrence: 1, kind: 'urgency', why: 'Rushing you.' }] });
    const edited = { ...before, body: 'Hello! ' + before.body };
    expect(rangesFor(edited.body, edited.flags).found[0]?.start).toBe(42);
  });

  it('reports a flag whose words were edited away', () => {
    const { found, lost } = rangesFor('Nothing here', [{ text: 'Pay now', occurrence: 0, kind: 'urgency', why: 'x' }]);
    expect(found).toEqual([]);
    expect(lost).toHaveLength(1);
  });

  it('sorts the ranges in reading order', () => {
    const { found } = rangesFor('aaa bbb ccc', [
      { text: 'ccc', occurrence: 0, kind: 'urgency', why: 'x' },
      { text: 'aaa', occurrence: 0, kind: 'secrecy', why: 'y' },
    ]);
    expect(found.map((f) => f.start)).toEqual([0, 8]);
  });
});

describe('saving and loading', () => {
  it('round trips, flags and all', () => {
    const m = message({ flags: [{ text: 'Pay now', occurrence: 1, kind: 'urgency', why: 'Rushing you.' }], loss: '500', consequence: 'You lost money.' });
    const back = fromInbox(toInbox([m]))[0]!;
    expect(back.flags).toEqual(m.flags);
    expect(back).toMatchObject({ from: 'AX-TEST', loss: '500', consequence: 'You lost money.', kind: 'scam' });
  });

  it('leaves out what does not apply', () => {
    const real = message({ kind: 'genuine', flags: [{ text: 'Pay now', occurrence: 0, kind: 'urgency', why: 'x' }], loss: '100', consequence: 'x' });
    const saved = toInbox([real]).messages[0]!;
    expect(saved.flags).toEqual([]);
    expect(saved.loss).toBeUndefined();
    expect(saved.consequence).toBeUndefined();
    const sms = toInbox([message()]).messages[0]!;
    expect(sms.subject).toBeUndefined();
    expect(toInbox([message({ channel: 'mail', subject: ' Hi ' })]).messages[0]?.subject).toBe('Hi');
  });

  it('reads amounts with commas and ignores junk', () => {
    expect(toInbox([message({ loss: '25,000' })]).messages[0]?.loss).toBe(25000);
    expect(toInbox([message({ loss: 'lots' })]).messages[0]?.loss).toBeUndefined();
  });
});
