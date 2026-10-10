/** The three paths the student splits money across. Shares are whole percents in steps of 5, summing to 100. */
export const MIX_IDS = ['steady_box', 'mixed_basket', 'bumpy_ride'] as const;
export type MixId = (typeof MIX_IDS)[number];
export type Mix = Record<MixId, number>;

export const STEP = 5;

export const defaultMix: Mix = { steady_box: 40, mixed_basket: 40, bumpy_ride: 20 };

const snap = (n: number) => Math.round(n / STEP) * STEP;

/**
 * Set one share and rescale the other two in proportion, so the total stays 100.
 * If both others are at 0 the remainder is split evenly.
 */
export function setShare(mix: Mix, id: MixId, value: number): Mix {
  const next = Math.min(100, Math.max(0, snap(value)));
  const [a, b] = MIX_IDS.filter((x) => x !== id) as [MixId, MixId];
  const remaining = 100 - next;
  const others = mix[a] + mix[b];
  const first = others === 0 ? snap(remaining / 2) : snap((remaining * mix[a]) / others);
  return { ...mix, [id]: next, [a]: first, [b]: remaining - first };
}

/** Fractions for the market engine. */
export function toWeights(mix: Mix): Record<MixId, number> {
  return { steady_box: mix.steady_box / 100, mixed_basket: mix.mixed_basket / 100, bumpy_ride: mix.bumpy_ride / 100 };
}
