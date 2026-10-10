import { describe, expect, it } from 'vitest';
import { frequency, length, mel, TRACKS, trackForMap } from './score';

describe('soundtrack', () => {
  it('tunes to A4 = 440 Hz and handles sharps and flats', () => {
    expect(frequency('A4')).toBeCloseTo(440);
    expect(frequency('A5')).toBeCloseTo(880);
    expect(frequency('C#5')).toBeCloseTo(frequency('Db5')!);
    expect(frequency('hat')).toBeNull();
  });

  it('every looping track has 8 full bars in every voice, so loops stay in time', () => {
    for (const track of Object.values(TRACKS).filter((t) => t.loop)) {
      for (const v of track.voices) expect(length(v.notes), `${track.id} ${v.wave}`).toBe(8 * 16);
    }
  });

  it('every note in every track is a real pitch or drum', () => {
    for (const track of Object.values(TRACKS)) {
      for (const v of track.voices) {
        for (const n of v.notes) {
          if (!n.pitch) continue;
          if (v.wave === 'noise') expect(['kick', 'snare', 'hat']).toContain(n.pitch);
          else expect(frequency(n.pitch), `${track.id} ${n.pitch}`).not.toBeNull();
        }
      }
    }
  });

  it('parses melodies and picks music by place', () => {
    expect(mel('E5:2 -:4')).toEqual([{ pitch: 'E5', steps: 2 }, { pitch: null, steps: 4 }]);
    expect(trackForMap('paisapur')).toBe('town');
    expect(trackForMap('bank')).toBe('indoor');
  });
});
