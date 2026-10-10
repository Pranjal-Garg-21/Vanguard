/**
 * Seeded random numbers. Same seed => same sequence, on every device.
 * Stand-in until P2's shared RNG lands; keep callers on the `Rng` interface so it is a one-line swap.
 */
export interface Rng {
  /** Uniform number in [0, 1). */
  next(): number;
  /** Standard normal (mean 0, standard deviation 1). */
  normal(): number;
  /** An independent stream derived from this one's seed and a label. Unaffected by how many numbers were drawn. */
  fork(label: string | number): Rng;
}

/** Mix any number of strings/numbers into one 32-bit seed (FNV-1a). */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const part of parts) {
    const s = String(part) + '|';
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return h >>> 0;
}

export function createRng(seed: number | string): Rng {
  const baseSeed = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  let a = baseSeed;
  let spare: number | null = null;

  // mulberry32
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Box-Muller, keeping the second value so no draw is wasted
  const normal = (): number => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    while (u === 0) u = next();
    const v = next();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };

  return { next, normal, fork: (label) => createRng(hashSeed(baseSeed, label)) };
}
