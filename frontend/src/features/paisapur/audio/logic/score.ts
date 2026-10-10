/**
 * The Paisapur soundtrack, written as data: original chiptune pieces in the
 * style of handheld RPGs (pulse-wave lead, triangle bass, noise drums).
 * Pure: notes and timings only; audio/engine.ts plays them with WebAudio.
 *
 * Time is counted in steps of a sixteenth note; a bar is 16 steps.
 * Melodies are written as "E5:2 G5:2 C6:4 -:4" (note:steps, "-" = rest).
 */

export type Wave = 'pulse50' | 'pulse25' | 'pulse12' | 'triangle' | 'noise';
/** A pitch like "C#5", a drum ("kick" | "snare" | "hat"), or null for a rest. */
export type Pitch = string | null;
export type Note = { pitch: Pitch; steps: number };
export type Voice = { wave: Wave; gain: number; notes: Note[] };
export type Track = { id: TrackId; bpm: number; loop: boolean; voices: Voice[] };

export type TrackId = 'town' | 'indoor' | 'lab' | 'city' | 'battle' | 'victory' | 'defeat' | 'badge' | 'goal' | 'sleep';

const STEPS_PER_BAR = 16;
const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Frequency of a pitch like "A4" (440 Hz), "C#5" or "Bb3"; null for drums and rests. */
export function frequency(pitch: Pitch): number | null {
  if (!pitch) return null;
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(pitch);
  if (!m) return null;
  const semis = NAMES[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * 2 ** ((semis - 69) / 12);
}

/** "E5:2 G5:2 -:4" → notes. */
export function mel(text: string): Note[] {
  return text
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [p, n] = tok.split(':');
      return { pitch: p === '-' ? null : p!, steps: Number(n ?? 1) };
    });
}

/** Semitone offsets of a chord name like "C", "Am", "F#m", "Bb", "E". */
function chord(name: string): { root: number; third: number } {
  const m = /^([A-G])(#|b)?(m?)$/.exec(name);
  if (!m) throw new Error(`bad chord ${name}`);
  const root = NAMES[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return { root: (root + 12) % 12, third: m[3] ? 3 : 4 };
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const pitchOf = (semitone: number, octave: number) => `${NOTE_NAMES[((semitone % 12) + 12) % 12]}${octave + Math.floor(semitone / 12)}`;

/** Root–fifth bass in eighth notes (or octave jumps for driving music), one chord per bar. */
export function bass(chords: string[], octave = 2, style: 'walk' | 'octave' = 'walk'): Note[] {
  const out: Note[] = [];
  for (const c of chords) {
    const { root } = chord(c);
    const pattern = style === 'octave' ? [0, 12, 0, 12, 0, 12, 0, 12] : [0, 7, 12, 7, 0, 7, 12, 7];
    for (const off of pattern) out.push({ pitch: pitchOf(root + off, octave), steps: 2 });
  }
  return out;
}

/** Broken-chord accompaniment, one chord per bar. */
export function arp(chords: string[], octave = 4, steps = 2): Note[] {
  const out: Note[] = [];
  for (const c of chords) {
    const { root, third } = chord(c);
    const tones = [0, third, 7, 12, 7, third];
    for (let i = 0; i < STEPS_PER_BAR / steps; i++) out.push({ pitch: pitchOf(root + tones[i % tones.length]!, octave), steps });
  }
  return out;
}

/** Drum pattern per bar: k = kick, s = snare, h = hat, . = rest (16 characters). */
export function drums(pattern: string, bars: number): Note[] {
  const map: Record<string, Pitch> = { k: 'kick', s: 'snare', h: 'hat', '.': null };
  const out: Note[] = [];
  for (let b = 0; b < bars; b++) for (const ch of pattern) out.push({ pitch: map[ch] ?? null, steps: 1 });
  return out;
}

export const length = (notes: Note[]) => notes.reduce((s, n) => s + n.steps, 0);

// ── The pieces (all original) ───────────────────────────────────────────

const TOWN_CHORDS = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'];
const INDOOR_CHORDS = ['F', 'Dm', 'Bb', 'C', 'F', 'Gm', 'C', 'F'];
const LAB_CHORDS = ['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'E'];
const CITY_CHORDS = ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D'];
const BATTLE_CHORDS = ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'E', 'E'];

export const TRACKS: Record<TrackId, Track> = {
  /** Paisapur: bright and easy-going. */
  town: {
    id: 'town',
    bpm: 116,
    loop: true,
    voices: [
      {
        wave: 'pulse25',
        gain: 0.16,
        notes: mel(`
          E5:2 G5:2 C6:4 B5:2 G5:2 E5:4
          A5:4 G5:2 E5:2 C5:4 E5:4
          F5:2 A5:2 C6:4 A5:2 F5:2 A5:4
          G5:6 F5:2 E5:4 D5:4
          E5:2 G5:2 C6:4 D6:2 C6:2 B5:4
          A5:4 C6:4 E6:4 C6:4
          D6:2 C6:2 A5:4 F5:4 A5:4
          G5:4 D5:4 G5:4 -:4`),
      },
      { wave: 'pulse12', gain: 0.06, notes: arp(TOWN_CHORDS, 4) },
      { wave: 'triangle', gain: 0.22, notes: bass(TOWN_CHORDS, 2) },
      { wave: 'noise', gain: 0.05, notes: drums('k...h...s...h...', 8) },
    ],
  },
  /** Shops, home and offices: gentle. */
  indoor: {
    id: 'indoor',
    bpm: 96,
    loop: true,
    voices: [
      {
        wave: 'pulse25',
        gain: 0.13,
        notes: mel(`
          A4:4 C5:4 F5:6 E5:2
          D5:4 F5:4 A4:8
          Bb4:4 D5:4 F5:4 D5:4
          C5:8 E5:4 G4:4
          A4:4 C5:4 F5:4 A5:4
          G5:6 F5:2 D5:8
          E5:4 G5:4 C5:4 E5:4
          F5:12 -:4`),
      },
      { wave: 'pulse12', gain: 0.05, notes: arp(INDOOR_CHORDS, 4, 4) },
      { wave: 'triangle', gain: 0.2, notes: bass(INDOOR_CHORDS, 2) },
    ],
  },
  /** Professor Arth's lab: curious, a little mysterious. */
  lab: {
    id: 'lab',
    bpm: 92,
    loop: true,
    voices: [
      {
        wave: 'pulse50',
        gain: 0.1,
        notes: mel(`
          A4:4 C5:4 E5:4 A5:4
          F5:6 E5:2 C5:8
          G4:4 C5:4 E5:4 G5:4
          D5:8 B4:8
          A4:2 B4:2 C5:4 E5:4 A5:4
          A5:4 G5:4 F5:4 C5:4
          G#4:4 B4:4 E5:4 D5:4
          E5:12 -:4`),
      },
      { wave: 'pulse12', gain: 0.05, notes: arp(LAB_CHORDS, 3, 2) },
      { wave: 'triangle', gain: 0.18, notes: bass(LAB_CHORDS, 2) },
    ],
  },
  /** Deccan City: busier, a step faster. */
  city: {
    id: 'city',
    bpm: 128,
    loop: true,
    voices: [
      {
        wave: 'pulse25',
        gain: 0.15,
        notes: mel(`
          B4:2 D5:2 G5:2 B5:2 A5:2 G5:2 D5:4
          E5:2 G5:2 B5:4 A5:2 G5:2 E5:4
          C5:2 E5:2 G5:2 C6:2 B5:2 G5:2 E5:4
          F#5:4 A5:4 D6:4 C6:4
          B5:4 G5:2 B5:2 D6:4 B5:4
          C6:2 B5:2 A5:2 G5:2 E5:8
          E5:2 G5:2 C6:4 B5:2 A5:2 G5:4
          A5:4 F#5:4 D5:8`),
      },
      { wave: 'pulse12', gain: 0.06, notes: arp(CITY_CHORDS, 4) },
      { wave: 'triangle', gain: 0.22, notes: bass(CITY_CHORDS, 2) },
      { wave: 'noise', gain: 0.05, notes: drums('k.h.s.h.k.h.s.hh', 8) },
    ],
  },
  /** Scam Duels: urgent and driving. */
  battle: {
    id: 'battle',
    bpm: 152,
    loop: true,
    voices: [
      {
        wave: 'pulse25',
        gain: 0.15,
        notes: mel(`
          A5:2 A5:2 E5:2 A5:2 C6:2 B5:2 A5:2 E5:2
          G5:2 A5:2 E5:4 C5:2 D5:2 E5:4
          F5:2 F5:2 C5:2 F5:2 A5:2 G5:2 F5:2 C5:2
          G5:2 G5:2 D5:2 G5:2 B5:4 D6:4
          E6:2 D6:2 C6:2 B5:2 A5:4 E5:4
          A5:2 B5:2 C6:2 D6:2 E6:8
          G#5:2 G#5:2 E5:2 G#5:2 B5:2 A5:2 G#5:2 E5:2
          B5:4 G#5:4 E5:4 B4:4`),
      },
      { wave: 'pulse12', gain: 0.06, notes: arp(BATTLE_CHORDS, 4, 1) },
      { wave: 'triangle', gain: 0.24, notes: bass(BATTLE_CHORDS, 2, 'octave') },
      { wave: 'noise', gain: 0.07, notes: drums('k.hhs.hhk.hhs.hs', 8) },
    ],
  },
  victory: {
    id: 'victory',
    bpm: 150,
    loop: false,
    voices: [
      { wave: 'pulse25', gain: 0.16, notes: mel('C5:2 E5:2 G5:2 C6:6 G5:2 A5:2 B5:2 C6:12') },
      { wave: 'triangle', gain: 0.22, notes: mel('C3:4 G3:4 C3:4 F3:4 G3:4 C3:10') },
    ],
  },
  defeat: {
    id: 'defeat',
    bpm: 100,
    loop: false,
    voices: [
      { wave: 'pulse50', gain: 0.12, notes: mel('E5:4 D#5:4 D5:4 C#5:12') },
      { wave: 'triangle', gain: 0.2, notes: mel('A2:8 F2:8 E2:8') },
    ],
  },
  badge: {
    id: 'badge',
    bpm: 140,
    loop: false,
    voices: [
      { wave: 'pulse25', gain: 0.16, notes: mel('G5:2 G5:2 G5:2 E5:2 G5:4 C6:12') },
      { wave: 'pulse12', gain: 0.07, notes: mel('E5:2 E5:2 E5:2 C5:2 E5:4 G5:12') },
      { wave: 'triangle', gain: 0.2, notes: mel('C3:8 G2:4 C3:12') },
    ],
  },
  goal: {
    id: 'goal',
    bpm: 132,
    loop: false,
    voices: [
      { wave: 'pulse25', gain: 0.16, notes: mel('G4:2 C5:2 E5:2 G5:4 E5:2 G5:4 A5:2 B5:2 C6:12') },
      { wave: 'triangle', gain: 0.22, notes: mel('C3:6 E3:6 F3:4 G3:4 C3:12') },
    ],
  },
  sleep: {
    id: 'sleep',
    bpm: 72,
    loop: false,
    voices: [
      { wave: 'triangle', gain: 0.18, notes: mel('E5:4 C5:4 G4:4 C5:4 E5:8 D5:4 C5:12') },
      { wave: 'pulse12', gain: 0.04, notes: mel('C4:16 G3:8 C4:16') },
    ],
  },
};

/** Which music plays where. */
export function trackForMap(map: string): TrackId {
  if (map === 'paisapur') return 'town';
  if (map === 'deccan') return 'city';
  if (map === 'lab') return 'lab';
  return 'indoor';
}
