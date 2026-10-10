/** What Investing, Gambling or Scam? saves (your last score), and a strict reader for it. */
export interface ScamSave {
  correct: number;
  total: number;
}

export function parseScamSave(value: unknown): ScamSave | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { correct, total } = value as Record<string, unknown>;
  if (typeof correct !== 'number' || typeof total !== 'number') return null;
  if (!Number.isInteger(correct) || !Number.isInteger(total) || total < 1 || total > 100 || correct < 0 || correct > total) return null;
  return { correct, total };
}
