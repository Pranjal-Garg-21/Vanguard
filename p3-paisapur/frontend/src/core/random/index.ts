/**
 * Seeded randomness. Every "random" thing in the game (irregular income,
 * market moves) is a pure function of the world seed and a few keys, so the
 * same seed always replays the same year. Owner: P2.
 */

/** 32-bit FNV-1a hash of a string. */
function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: a small, fast, good-enough PRNG. Returns a function giving [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A uniform number in [0, 1) fixed by the seed and the keys, e.g. uniform(seed, 'income', 3). */
export function uniform(seed: number, ...keys: (string | number)[]): number {
  return mulberry32(hashString(`${seed}|${keys.join('|')}`))();
}

/** A standard normal number (mean 0, sd 1) fixed by the seed and the keys. */
export function normal(seed: number, ...keys: (string | number)[]): number {
  const next = mulberry32(hashString(`${seed}|${keys.join('|')}|n`));
  const u1 = Math.max(next(), 1e-12);
  const u2 = next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** A new world seed from any number (e.g. a timestamp passed in by the UI). */
export function makeSeed(from: number): number {
  return hashString(String(from)) || 1;
}
