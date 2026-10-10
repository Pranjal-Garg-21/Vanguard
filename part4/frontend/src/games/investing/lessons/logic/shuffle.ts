import { createRng, hashSeed } from '@/core/market';

/** Same order every time for the same question, but not "the right answer is always first". */
export function shuffleStable<T>(items: T[], seedText: string): T[] {
  const rng = createRng(hashSeed('check', seedText));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
