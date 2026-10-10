import { describe, it, expect } from 'vitest';
import { assumptions } from '@/core/market';
import { typicalHigh, typicalLow, spreadLoss } from '@/core/market/finance';
import { pathRange, basketSplit } from './explore';
import { rooms } from './content';

/** Lesson numbers for a path are typed into the room's vars. These tests stop them drifting from assumptions.json. */
const PREFIX: Record<string, string> = { sMean: 'steady_box', mMean: 'mixed_basket', bMean: 'bumpy_ride' };

describe('lessons that quote a path agree with assumptions.json', () => {
  for (const room of rooms) {
    for (const [meanName, asset] of Object.entries(PREFIX)) {
      const letter = meanName[0]!;
      if (!room.vars?.[meanName]) continue;
      it(`${room.id}: ${asset}`, () => {
        const a = assumptions.assets[asset]!;
        expect(room.vars![`${letter}Mean`]!.value).toBe(a.meanAnnual);
        expect(room.vars![`${letter}Fee`]!.value).toBe(a.fee);
        expect(room.vars![`${letter}Vol`]!.value).toBe(a.volAnnual);
      });
    }
  }
});

describe('typical year', () => {
  it('is growth after fees, plus or minus one swing', () => {
    expect(typicalLow(10000, 0.13, 0.005, 0.22)).toBeCloseTo(9050);
    expect(typicalHigh(10000, 0.13, 0.005, 0.22)).toBeCloseTo(13450);
    expect(pathRange(10000, 'steady_box').width).toBeCloseTo(300);
  });
  it('a bumpier path has a wider range', () => {
    expect(pathRange(10000, 'bumpy_ride').width).toBeGreaterThan(pathRange(10000, 'mixed_basket').width);
    expect(pathRange(10000, 'mixed_basket').width).toBeGreaterThan(pathRange(10000, 'steady_box').width);
  });
});

describe('spreading', () => {
  it('one fall costs a slice, a market-wide fall costs the same however many you hold', () => {
    expect(spreadLoss(6000, 0.3, 1, 'one')).toBeCloseTo(1800);
    expect(spreadLoss(6000, 0.3, 6, 'one')).toBeCloseTo(300);
    expect(spreadLoss(6000, 0.3, 1, 'market')).toBeCloseTo(1800);
    expect(spreadLoss(6000, 0.3, 6, 'market')).toBeCloseTo(1800);
  });
  it('rejects zero businesses', () => {
    expect(() => spreadLoss(100, 0.1, 0, 'one')).toThrow();
  });
  it('reports slice, loss and what is left', () => {
    const r = basketSplit(6000, 0.3, 6, 'one');
    expect(r.eachSlice).toBe(1000);
    expect(r.loss).toBeCloseTo(300);
    expect(r.left).toBeCloseTo(5700);
  });
});
