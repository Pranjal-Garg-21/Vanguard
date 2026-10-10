import { describe, expect, it } from 'vitest';
import { BASELINE_QUESTIONS } from '../questions';
import { levelFor, scoreBaseline } from './score';

describe('levelFor', () => {
  it('maps the share of right answers to a level', () => {
    expect(levelFor(0, 5)).toBe('starter');
    expect(levelFor(1, 5)).toBe('starter');
    expect(levelFor(2, 5)).toBe('builder');
    expect(levelFor(3, 5)).toBe('builder');
    expect(levelFor(4, 5)).toBe('navigator');
    expect(levelFor(0, 0)).toBe('starter');
  });
});

describe('scoreBaseline', () => {
  it('scores right answers and collects misconceptions', () => {
    const result = scoreBaseline(
      {
        needs: 'buspass',
        saveFirst: 'leftover',
        interest: 'a1040',
        prize: 'pay',
        upiPin: 'not_sure',
        confidence: 'c3',
        experience: ['upi', 'none'],
        goal: 'fees',
      },
      BASELINE_QUESTIONS,
      1000,
    );

    expect(result.knowledge.correct).toBe(2);
    expect(result.knowledge.total).toBe(5);
    expect(result.knowledge.byConcept.upi_collect).toBe(false);
    expect(result.knowledge.misconceptions).toEqual(['save_what_is_left', 'advance_fee_is_normal']);
    expect(result.level).toBe('builder');
    expect(result.confidence).toBe(3);
    expect(result.experience).toEqual(['upi']);
    expect(result.goal).toBe('fees');
    expect(result.moneySource).toBeNull();
  });

  it('treats an empty set of answers as a starter with nothing recorded', () => {
    const result = scoreBaseline({}, BASELINE_QUESTIONS, 1);
    expect(result.level).toBe('starter');
    expect(result.confidence).toBeNull();
    expect(result.knowledge.misconceptions).toEqual([]);
  });
});
