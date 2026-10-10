/**
 * Seeded RNG for verb components. Owner: P3.
 *
 * Verbs must be replayable: the same seed has to produce the same card order,
 * or a rewound life would not match the original (§9.2).
 *
 * TODO(P2): `core/random` is the home for the world RNG and the event tape.
 * When it lands, delete this and use it — this exists only so the verbs could
 * be built and shuffled deterministically before then.
 */

export type Rng = () => number;

/** mulberry32 — small, fast, good enough for shuffling a deck of 30 cards. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates. Returns a new array; the input is untouched. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    // Both indices are in range, but the project compiles with
    // noUncheckedIndexedAccess, so narrow rather than assert.
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * Derive a per-activity seed from the world seed so two games in the same month
 * do not shuffle identically.
 */
export function deriveSeed(seed: number, salt: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(h ^ salt.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}
