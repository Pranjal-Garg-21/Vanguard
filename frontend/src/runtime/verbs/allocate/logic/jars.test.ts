import { describe, expect, it } from 'vitest';

import { findUnderfunded, type AllocateJar } from './jars';

const jars: AllocateJar[] = [
  {
    id: 'needs',
    textKey: 'jar.needs',
    bills: [
      { id: 'bus', textKey: 'bill.bus', amount: 300 },
      { id: 'exam', textKey: 'bill.exam', amount: 500 },
    ],
  },
  { id: 'wants', textKey: 'jar.wants' },
  { id: 'future', textKey: 'jar.future' },
];

describe('the live overflow check', () => {
  it('reports nothing when the bills are covered', () => {
    expect(findUnderfunded(jars, { needs: 800, wants: 0, future: 0 })).toEqual([]);
  });

  it('names the cheapest bill when nothing is affordable', () => {
    const [short] = findUnderfunded(jars, { needs: 250, wants: 300, future: 250 });
    expect(short?.shortfall).toBe(550);
    // ₹250 cannot even cover the ₹300 bus pass.
    expect(short?.firstUncoveredBillKey).toBe('bill.bus');
  });

  it('names the bill that actually runs out, not just the first one', () => {
    const [short] = findUnderfunded(jars, { needs: 400, wants: 0, future: 0 });
    // ₹400 pays the ₹300 bus pass, leaving ₹100 against a ₹500 exam fee.
    expect(short?.firstUncoveredBillKey).toBe('bill.exam');
    expect(short?.shortfall).toBe(400);
  });

  it('ignores jars that have no bills', () => {
    expect(findUnderfunded([jars[1]!], { wants: 0 })).toEqual([]);
  });
});
