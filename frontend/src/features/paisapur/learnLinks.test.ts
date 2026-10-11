import { describe, expect, it } from 'vitest';
import { learnLinks } from './learnLinks';

describe('learnLinks', () => {
  it('sends an investing idea to the lesson that teaches it', () => {
    const links = learnLinks('profit_loss');
    expect(links.some((l) => l.kind === 'lesson' && l.to === '/learn/invest/lesson_profit_loss')).toBe(true);
  });

  it('sends a scam idea to a simulation', () => {
    expect(learnLinks('loan_app_trap')).toContainEqual({ kind: 'simulation', to: '/safe/loan' });
  });

  it('always offers somewhere to go', () => {
    expect(learnLinks('an_idea_nothing_teaches').length).toBeGreaterThan(0);
  });
});
