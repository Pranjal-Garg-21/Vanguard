import { describe, expect, it } from 'vitest';

import { detectFunIsBad, type FunRecord } from './fun';

const rec = (id: string, bucketId: string, correct?: boolean): FunRecord => ({
  card: { id },
  bucketId,
  correct,
});

describe('detecting fun_is_bad', () => {
  it('flags a student who pushes every enjoyable thing into wants', () => {
    expect(
      detectFunIsBad([
        rec('biryani_friends', 'want', undefined),
        rec('movie_ticket', 'want', true),
        rec('birthday_gift', 'want', undefined),
      ]),
    ).toBe(true);
  });

  it('does not flag someone who treats an ambiguous social cost as a need', () => {
    expect(
      detectFunIsBad([
        rec('biryani_friends', 'need', undefined),
        rec('movie_ticket', 'want', true),
        rec('birthday_gift', 'want', undefined),
      ]),
    ).toBe(false);
  });

  it('needs enough evidence before accusing anyone', () => {
    // Two fun cards is not a pattern.
    expect(
      detectFunIsBad([rec('movie_ticket', 'want', true), rec('fest_ticket', 'want', true)]),
    ).toBe(false);
  });

  it('does not fire when no ambiguous card was involved', () => {
    // Sorting clear-cut wants as wants is simply correct, not a misconception.
    expect(
      detectFunIsBad([
        rec('movie_ticket', 'want', true),
        rec('fest_ticket', 'want', true),
        rec('festival_clothes', 'want', true),
      ]),
    ).toBe(false);
  });

  it('ignores non-fun cards entirely', () => {
    expect(detectFunIsBad([rec('bus_pass', 'want', false), rec('exam_fee', 'want', false)])).toBe(
      false,
    );
  });
});
