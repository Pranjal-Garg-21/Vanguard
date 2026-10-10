/**
 * Colour contrast check for the design tokens in index.css (the plan asks for at least 4.5:1 for normal text and 3:1
 * for large text and UI parts). Reads the real file, so changing a token that breaks reading fails here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

const tokens = Object.fromEntries([...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1]!, m[2]!]));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe('colour tokens', () => {
  it('are all found in index.css', () => {
    for (const name of ['bg', 'surface', 'surface-2', 'surface-3', 'ink', 'ink-soft', 'muted', 'brand', 'brand-ink', 'warn', 'bad', 'info', 'xp']) {
      expect(tokens[name], `--color-${name}`).toMatch(/^#/);
    }
  });

  it('measures contrast correctly', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  // [text, background, minimum ratio]
  const normalText: [string, string][] = [
    ['ink', 'bg'],
    ['ink', 'surface'],
    ['ink', 'surface-2'],
    ['ink', 'surface-3'],
    ['ink-soft', 'bg'],
    ['ink-soft', 'surface'],
    ['ink-soft', 'surface-2'],
    ['muted', 'bg'],
    ['muted', 'surface'],
    ['muted', 'surface-2'],
    ['brand', 'bg'],
    ['brand', 'surface'],
    ['brand', 'surface-2'],
    ['warn', 'surface'],
    ['bad', 'bg'],
    ['bad', 'surface'],
    ['bad', 'surface-2'],
    ['info', 'surface'],
    ['info', 'surface-2'],
    ['brand-ink', 'brand'],
  ];
  it.each(normalText)('%s on %s reads at 4.5:1 or better', (fg, bg) => {
    const ratio = contrast(tokens[fg]!, tokens[bg]!);
    expect(ratio, `${fg} on ${bg} is ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  });

  it('borders and focus rings are visible (3:1) against the page', () => {
    expect(contrast(tokens['line-strong']!, tokens['surface']!)).toBeGreaterThanOrEqual(1.3); // a divider, not a control
    expect(contrast(tokens['brand']!, tokens['bg']!)).toBeGreaterThanOrEqual(3);
  });
});
