import { describe, expect, it } from 'vitest';
import { checkNumberAnswer, expectedDisplay, parseAnswer } from './room';

describe('parseAnswer', () => {
  it('reads plain numbers, rupee signs, commas and percent signs', () => {
    expect(parseAnswer('150')).toBe(150);
    expect(parseAnswer('₹150')).toBe(150);
    expect(parseAnswer(' 150 ')).toBe(150);
    expect(parseAnswer('1,00,000')).toBe(100000);
    expect(parseAnswer('₹2,99,599')).toBe(299599);
    expect(parseAnswer('60%')).toBe(60);
    expect(parseAnswer('60 %')).toBe(60);
    expect(parseAnswer('Rs 150')).toBe(150);
    expect(parseAnswer('Rs. 150')).toBe(150);
  });
  it('reads negatives however they are typed', () => {
    expect(parseAnswer('-50')).toBe(-50);
    expect(parseAnswer('₹-50')).toBe(-50);
    expect(parseAnswer('-₹50')).toBe(-50);
    expect(parseAnswer('−50')).toBe(-50); // typographic minus
    expect(parseAnswer('-20%')).toBe(-20);
  });
  it('reads decimals', () => {
    expect(parseAnswer('12.5')).toBe(12.5);
    expect(parseAnswer('.5')).toBe(0.5);
    expect(parseAnswer('150.')).toBe(150);
  });
  it('rejects things that are not a single number', () => {
    for (const bad of ['', '   ', 'abc', '15 0 0x', '1.2.3', '--5', '5-', 'fifty', '₹', '%']) {
      expect(parseAnswer(bad), `"${bad}"`).toBeNull();
    }
  });
});

describe('checkNumberAnswer', () => {
  it('accepts the right rupee answer in any format', () => {
    for (const typed of ['150', '₹150', '150.0', '150.4']) expect(checkNumberAnswer(typed, 150, 'rupees')).toBe('correct');
  });
  it('percent answers are typed as 60, not 0.6', () => {
    expect(expectedDisplay(0.6, 'percent')).toBeCloseTo(60);
    expect(checkNumberAnswer('60', 0.6, 'percent')).toBe('correct');
    expect(checkNumberAnswer('60%', 0.6, 'percent')).toBe('correct');
    expect(checkNumberAnswer('0.6', 0.6, 'percent')).toBe('wrong');
  });
  it('negative answers work, and the sign matters', () => {
    expect(checkNumberAnswer('-50', -50, 'rupees')).toBe('correct');
    expect(checkNumberAnswer('50', -50, 'rupees')).toBe('wrong');
    expect(checkNumberAnswer('-20', -0.2, 'percent')).toBe('correct');
    expect(checkNumberAnswer('20', -0.2, 'percent')).toBe('wrong');
  });
  it('is wrong outside the tolerance and right inside it', () => {
    expect(checkNumberAnswer('151', 150, 'rupees')).toBe('wrong');
    expect(checkNumberAnswer('150.5', 150, 'rupees')).toBe('correct');
    expect(checkNumberAnswer('152', 150, 'rupees', 2)).toBe('correct');
  });
  it('reports invalid input separately from a wrong answer', () => {
    expect(checkNumberAnswer('banana', 150, 'rupees')).toBe('invalid');
    expect(checkNumberAnswer('', 150, 'rupees')).toBe('invalid');
  });
  it('handles the real room answers (rounding in the lesson, exact in the check)', () => {
    expect(checkNumberAnswer('25', 0.25, 'percent')).toBe('correct'); // 20% fall needs 25%
    expect(checkNumberAnswer('400', 4, 'percent')).toBe('correct'); // 80% fall needs 400%
    expect(checkNumberAnswer('1,00,000', 100000, 'rupees')).toBe('correct');
  });
});
