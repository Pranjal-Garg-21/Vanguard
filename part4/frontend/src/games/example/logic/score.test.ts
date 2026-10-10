import { describe, expect, it } from 'vitest';
import { scoreAnswer } from './score';

describe('scoreAnswer', () => {
  it('is correct only for the right choice', () => {
    expect(scoreAnswer('a', 'a')).toBe(true);
    expect(scoreAnswer('b', 'a')).toBe(false);
  });
});
