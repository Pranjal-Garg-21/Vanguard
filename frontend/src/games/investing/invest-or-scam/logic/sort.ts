/** Scoring for Investing, Gambling or Scam? Pure: no React, no storage. */

export type Bucket = 'investing' | 'gambling' | 'scam';

export interface ScamCard {
  id: string;
  answer: Bucket;
  /** Signs shown after the answer, red flags and good signs. */
  tells: string[];
  /** The misconception behind the classic wrong answer for this card, if any. */
  trap?: string;
}

export interface ScamConfig {
  buckets: Bucket[];
  cards: ScamCard[];
  tellKinds: Record<string, 'flag' | 'good'>;
}

export const isCorrect = (card: ScamCard, bucket: Bucket) => card.answer === bucket;

/** The misconception to log when someone calls a trap card "investing". Otherwise none. */
export function misconceptionFor(card: ScamCard, bucket: Bucket): string | undefined {
  return !isCorrect(card, bucket) && bucket === 'investing' ? card.trap : undefined;
}

export interface Summary {
  correct: number;
  total: number;
  /** For each bucket: how many of its cards you sorted correctly, out of how many it had. */
  byBucket: Record<Bucket, { correct: number; total: number }>;
  /** Red flags you missed, most often missed first (from cards you got wrong). */
  missedFlags: string[];
}

export function summarise(config: ScamConfig, answers: Record<string, Bucket>): Summary {
  const byBucket: Summary['byBucket'] = {
    investing: { correct: 0, total: 0 },
    gambling: { correct: 0, total: 0 },
    scam: { correct: 0, total: 0 },
  };
  const missed = new Map<string, number>();
  let correct = 0;
  for (const card of config.cards) {
    byBucket[card.answer].total++;
    const given = answers[card.id];
    if (given && isCorrect(card, given)) {
      correct++;
      byBucket[card.answer].correct++;
    } else {
      for (const tell of card.tells) if (config.tellKinds[tell] === 'flag') missed.set(tell, (missed.get(tell) ?? 0) + 1);
    }
  }
  const missedFlags = [...missed.entries()].sort((a, b) => b[1] - a[1]).map(([tell]) => tell);
  return { correct, total: config.cards.length, byBucket, missedFlags };
}

/** A fixed shuffle for a seed, so a replay can use a different order but a class sees the same one. */
export function order(ids: string[], seed: number | string): string[] {
  let h = 2166136261;
  for (const ch of `${seed}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const next = () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 4294967296;
  };
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
