/** Pure helpers for FanChart: no React, so they are easy to test. */

/** Divide each month's value by what prices have grown to by then, so rupees mean today's rupees. */
export function deflate(series: number[], annualInflation: number): number[] {
  return series.map((v, month) => v / Math.pow(1 + annualInflation, month / 12));
}

/** Short Indian-style label for an axis: ₹500, ₹5k, ₹2.5L, ₹1.2Cr. */
export function compactRupees(n: number): string {
  const abs = Math.abs(n);
  const trim = (v: number) => String(Number(v.toFixed(1)));
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

/** Round-number tick values from 0 up to a ceiling at or above `max`, at most `maxTicks` of them (plus 0). */
export function niceTicks(max: number, maxTicks = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / maxTicks;
  const base = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * base).find((s) => s >= rough) ?? rough;
  const ticks: number[] = [];
  for (let v = 0; v < max + step; v += step) {
    ticks.push(Number(v.toPrecision(12)));
    if (v >= max) break;
  }
  return ticks;
}

type Scale = (n: number) => number;

/** SVG path for one line through `values` (index = month). */
export function linePath(values: number[], x: Scale, y: Scale): string {
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
}

/** SVG path for the filled area between a lower and an upper line. */
export function bandPath(lower: number[], upper: number[], x: Scale, y: Scale): string {
  const top = upper.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const bottom = lower.map((_, i) => {
    const j = lower.length - 1 - i;
    return `L${x(j).toFixed(1)},${y(lower[j]!).toFixed(1)}`;
  });
  return `${top.join(' ')} ${bottom.join(' ')} Z`;
}
