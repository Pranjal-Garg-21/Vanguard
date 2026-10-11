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

/**
 * The rule is about icons: a picture standing in for a control or a label.
 * It is not about artwork. Two places draw pictures on purpose and are
 * exempt, each named rather than pattern-matched, so a new offender shows up:
 *
 * - Paisapur is a pixel-art RPG (P2). Its town, bag, menus and Journal use
 *   emoji as sprites. Replacing them with outline icons would change what the
 *   game looks like, which is a design decision, not a lint fix.
 * - A game's content may carry an `emoji` or `icon` field — the Needs jar
 *   showing a house, a concept card's glyph. That is the item's picture, and
 *   it is the only place a content file may hold one.
 */
const ARTWORK = [
  'features/paisapur',
  'features/onboarding/baseline',
  'features/arcade/ArcadeHub.tsx',
  'content/i18n/*/paisapur.json',
  'content/i18n/*/menu.json',
  'content/i18n/*/bag.json',
  'content/i18n/*/toast.json',
];

/**
 * A translated bundle carries the same sprites as the English one, so the
 * allowed paths name the file and not the language: content/i18n/te/menu.json
 * is the same file as content/i18n/en/menu.json in a different language.
 */
const withoutLanguage = (file: string) => file.replace(/^content\/i18n\/[a-z]{2}\//, 'content/i18n/*/');

const isArtwork = (file: string) => ARTWORK.some((allowed) => withoutLanguage(file).startsWith(allowed));

/**
 * A content file may hold emoji only as the value of an `emoji` or `icon`
 * field. Anywhere else in content — a label, a hint, a question — is a string
 * a student reads, and it goes through the icon set like everything else.
 */
function emojiOutsideArtFields(file: string, body: string): boolean {
  if (!file.endsWith('.json')) return EMOJI.test(body);
  const withoutArt = body.replace(/"(?:emoji|icon)"\s*:\s*"[^"]*"/g, '""');
  return EMOJI.test(withoutArt);
}

describe('icons', () => {
  it('uses Lucide only through ui/Icon', () => {
    const offenders = sources.filter((f) => f !== ICON_FILE && /from ['"]lucide-react['"]/.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('has no other icon library', () => {
    const offenders = sources.filter((f) => /from ['"](react-icons|@heroicons|@fortawesome|@tabler\/icons|phosphor)/.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('has no emoji standing in for an icon', () => {
    const offenders = sources
      .map((f) => [relative(ROOT, f), readFileSync(f, 'utf8')] as const)
      .filter(([file, body]) => !isArtwork(file) && emojiOutsideArtFields(file, body))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });

  it('has no text symbols standing in for icons', () => {
    const offenders = sources
      .map((f) => [relative(ROOT, f), readFileSync(f, 'utf8')] as const)
      .filter(([file, body]) => !isArtwork(file) && (SYMBOL_ICONS.test(body) || GLYPH_IN_TEXT.test(body)))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});
