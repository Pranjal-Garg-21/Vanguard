/**
 * Guardrail: investing content must never name a real company, fund, app, index, scheme or coin.
 * Everything a student sees about money is fictional ("Deccan Roads Bond", "Chaiwala Ltd").
 * Regulators are named generally ("the market regulator"), never by name.
 *
 * Add a name to a list below when you think of one. The test scans every investing text file.
 */
import { describe, it, expect } from 'vitest';

/** Matched case-insensitively, as whole words. */
const ANY_CASE = [
  'zerodha', 'groww', 'upstox', 'paytm', 'phonepe', 'google pay', 'gpay', 'angel one', 'robinhood', 'coinbase', 'binance', 'wazirx',
  'hdfc', 'icici', 'sbi', 'kotak', 'nippon', 'mirae', 'vanguard', 'blackrock', 'fidelity',
  'nifty', 'sensex', 'nasdaq', 'dow jones', 's&p',
  'sebi', 'nse', 'bse', 'rbi', 'amfi', 'irdai', 'nps', 'ppf', 'elss', 'sukanya', 'kisan vikas', 'sovereign gold bond',
  'infosys', 'wipro', 'adani', 'ambani', 'maruti', 'tesla', 'nvidia', 'microsoft', 'netflix', 'zomato', 'swiggy',
  'bitcoin', 'ethereum', 'dogecoin', 'shiba', 'warren buffett', 'rakesh jhunjhunwala', 'harshad mehta',
];

/** Common words as well as brands, so these only match when capitalised the way a brand is. */
const CAPITALISED_ONLY = ['Tata', 'Reliance', 'Axis', 'Apple', 'Amazon', 'Google', 'Meta', 'TCS', 'LIC', 'Bajaj', 'Birla', 'Mahindra'];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&');
const anyCase = new RegExp(`(?<![A-Za-z])(${ANY_CASE.map(escape).join('|')})(?![A-Za-z])`, 'i');
const capitalised = new RegExp(`(?<![A-Za-z])(${CAPITALISED_ONLY.map(escape).join('|')})(?![A-Za-z])`);

export function findBrand(text: string): string | undefined {
  return anyCase.exec(text)?.[1] ?? capitalised.exec(text)?.[1];
}

const files = {
  ...import.meta.glob('/src/content/**/*.json', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob(['/src/games/investing/**/*.{ts,tsx}', '/src/ui/**/*.{ts,tsx}', '/src/runtime/verbs/predict/*.{ts,tsx}', '!**/*.test.*'], {
    eager: true,
    query: '?raw',
    import: 'default',
  }),
} as Record<string, string>;

/** Strings in JSON keep their text; for code we scan everything, comments included, which is stricter. */
describe('no real brand names', () => {
  it('scans a useful number of files', () => {
    expect(Object.keys(files).length).toBeGreaterThan(30);
  });

  it.each(Object.entries(files))('%s', (path, text) => {
    const hit = findBrand(text);
    expect(hit, `"${hit}" in ${path}: use a fictional name instead`).toBeUndefined();
  });

  it('the detector itself works', () => {
    expect(findBrand('Open a Zerodha account')).toBe('Zerodha');
    expect(findBrand('track the NIFTY 50')).toBe('NIFTY');
    expect(findBrand('Tata Motors')).toBe('Tata');
    expect(findBrand('the market regulator')).toBeUndefined();
    expect(findBrand('a tata of the axis of the bse')).toBe('bse');
    expect(findBrand('the y axis and an apple a day')).toBeUndefined();
    expect(findBrand('Deccan Roads Bond and Chaiwala Ltd')).toBeUndefined();
  });
});
