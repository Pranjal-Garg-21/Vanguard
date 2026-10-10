/**
 * Keeps the UI consistent: every icon is a Lucide icon drawn through ui/Icon,
 * and no emoji or text symbol stands in for an icon. This runs with the other
 * tests, so a stray emoji or a second icon library fails the build.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const ICON_FILE = join(ROOT, 'ui', 'Icon.tsx');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const sources = walk(ROOT).filter((f) => /\.(tsx?|json|css)$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes(`${join(ROOT, 'test')}`));

// Emoji and pictographs, plus the symbols people use as quick icons.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{23E9}-\u{23FF}]/u;
const SYMBOL_ICONS = /[●○★☆＋◀▶✕✖✗✓]/u;
// Arrows and crosses used as icons in the text of a screen (not in comments).
const GLYPH_IN_TEXT = />\s*[←-↓]\s|←\s*\{t\(|←\s*[A-Z]|×</u;

describe('icons', () => {
  it('uses Lucide only through ui/Icon', () => {
    const offenders = sources.filter((f) => f !== ICON_FILE && /from ['"]lucide-react['"]/.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('has no other icon library', () => {
    const offenders = sources.filter((f) => /from ['"](react-icons|@heroicons|@fortawesome|@tabler\/icons|phosphor)/.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('has no emoji in the app or its text', () => {
    const offenders = sources.filter((f) => EMOJI.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('has no text symbols standing in for icons', () => {
    const offenders = sources.filter((f) => SYMBOL_ICONS.test(readFileSync(f, 'utf8')) || GLYPH_IN_TEXT.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
