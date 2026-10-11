/**
 * Facilitator-made scam scenarios ("custom inbox"). Plain TypeScript with no
 * dependencies, so the facilitator builder, the phone and the backend can all
 * use it. Owner: P5.
 *
 * A facilitator writes a few messages, says which are scams, and marks the
 * words that give a scam away. The phone turns that into the same kind of
 * script the built-in rooms use. Everything is plain text: no links, no
 * images, no HTML, and nothing that points to a real person or website.
 */

export const FLAG_KINDS = ['urgency', 'too_good', 'asks_secret', 'pretends', 'secrecy', 'odd_link', 'pulls_money'] as const;
export type FlagKind = (typeof FLAG_KINDS)[number];

export const CHANNELS = ['sms', 'chat', 'mail'] as const;
export type Channel = (typeof CHANNELS)[number];

export const CUSTOM_LIMITS = {
  title: 60,
  brief: 280,
  minMessages: 2,
  maxMessages: 10,
  from: 40,
  subject: 80,
  body: 500,
  why: 200,
  explain: 300,
  consequence: 300,
  flagsPerMessage: 4,
  maxLoss: 50_000,
  /** Largest scenario the server accepts, in bytes of JSON. */
  maxBytes: 60_000,
} as const;

/** A warning sign, as a range of characters in the message body. */
export type CustomFlag = { start: number; end: number; kind: FlagKind; why: string };

export type CustomMessage = {
  id: string;
  channel: Channel;
  kind: 'scam' | 'genuine';
  /** Sender name or code. For mail this is the sender's name. */
  from: string;
  /** Mail only. */
  subject?: string;
  body: string;
  /** Scams need at least one. Real messages have none. */
  flags: CustomFlag[];
  /** Why this is a scam, or why it is real. Shown as the "why" in feedback. */
  explain: string;
  /** Optional: what a student would lose if they opened it, in rupees. */
  loss?: number;
  /** Optional: what would have happened. Shown after a student opens a scam. */
  consequence?: string;
};

export type CustomInbox = { v: 1; messages: CustomMessage[] };

/** What the phone downloads for a class. */
export type CustomScenarioRow = {
  id: string;
  version: number;
  title: string;
  brief: string;
  /** A concept ID from the concept list, so results appear in the class Insights. */
  concept: string;
  /** What language the text is written in, for display only. */
  language: string;
  body: CustomInbox;
};

// --------------------------------------------------------------------------------------------
// Safety: nothing may point to a real person, number or website.
// --------------------------------------------------------------------------------------------

// Web addresses: anything with a scheme or www, or a name ending in a common real top-level domain.
const TLDS = 'com|in|org|net|co|io|me|app|info|biz|xyz|link|ly|gl|us|uk|edu|gov|ac|tv|site|online|shop|top|club|to|cc|page|dev|ai';
const URL_LIKE = new RegExp(`(?:https?:\\/\\/|www\\.)\\S+|\\b[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:${TLDS})\\b(?:\\/\\S*)?`, 'gi');
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const LONG_NUMBER = /(?:\+?\d[\d\s-]{8,}\d)/g;
const HTML_LIKE = /<[^>]*>/;

/** Fake addresses must end in .example so they can never be real. */
const isFakeHost = (host: string) => /\.example(?:[/:?#]|$)/i.test(host) || /^example(?:[/:?#]|$)/i.test(host);

/**
 * Returns a plain-language problem with the text, or null when it is fine.
 * Teaching a "strange link" is allowed, but the link must use a .example address.
 */
export function unsafeText(text: string): string | null {
  if (HTML_LIKE.test(text)) return 'Use plain text only. Remove anything in angle brackets.';
  for (const match of text.match(EMAIL_LIKE) ?? []) {
    if (!isFakeHost(match.split('@')[1] ?? '')) return `"${match}" looks like a real email address. Use a made-up one that ends in .example.`;
  }
  for (const match of text.match(URL_LIKE) ?? []) {
    if (!isFakeHost(match.replace(/^https?:\/\//i, '').replace(/^www\./i, ''))) {
      return `"${match}" looks like a real website. For a fake link, end the address in .example, for example kyc-update.example/login.`;
    }
  }
  for (const match of text.match(LONG_NUMBER) ?? []) {
    return `"${match.trim()}" looks like a real phone, account or ID number. Mask it, for example 98xxx xx210.`;
  }
  return null;
}

// --------------------------------------------------------------------------------------------
// Validation
// --------------------------------------------------------------------------------------------

export type CustomDraft = { title: string; brief: string; concept: string; body: CustomInbox };

function checkField(label: string, value: string | undefined, max: number, required: boolean, errors: string[]) {
  const text = (value ?? '').trim();
  if (required && text.length === 0) errors.push(`${label} is empty.`);
  if (text.length > max) errors.push(`${label} is too long (${text.length} of ${max} characters).`);
  const bad = unsafeText(text);
  if (bad) errors.push(`${label}: ${bad}`);
}

/** Every problem that would stop this scenario from being published. Empty means it is ready. */
export function validateCustom(draft: CustomDraft, validConcepts: readonly string[]): string[] {
  const errors: string[] = [];
  const { body } = draft;
  const L = CUSTOM_LIMITS;

  checkField('Title', draft.title, L.title, true, errors);
  checkField('Introduction', draft.brief, L.brief, true, errors);
  if (!validConcepts.includes(draft.concept)) errors.push('Choose what skill this tests.');

  if (!body || body.v !== 1 || !Array.isArray(body.messages)) return [...errors, 'The scenario is not in the right format.'];
  const { messages } = body;
  if (messages.length < L.minMessages) errors.push(`Add at least ${L.minMessages} messages.`);
  if (messages.length > L.maxMessages) errors.push(`Use at most ${L.maxMessages} messages.`);
  if (messages.length > 0 && !messages.some((m) => m.kind === 'scam')) errors.push('Include at least one scam.');
  if (messages.length >= 3 && !messages.some((m) => m.kind === 'genuine')) errors.push('Include at least one real message, so students learn not to block everything.');
  if (new Set(messages.map((m) => m.id)).size !== messages.length) errors.push('Two messages share the same ID.');

  messages.forEach((m, i) => {
    const n = `Message ${i + 1}`;
    if (!CHANNELS.includes(m.channel)) errors.push(`${n}: choose SMS, chat or email.`);
    checkField(`${n} sender`, m.from, L.from, true, errors);
    if (m.channel === 'mail') checkField(`${n} subject`, m.subject, L.subject, true, errors);
    checkField(`${n} text`, m.body, L.body, true, errors);
    checkField(`${n} explanation`, m.explain, L.explain, true, errors);
    if (m.consequence) checkField(`${n} what would have happened`, m.consequence, L.consequence, false, errors);
    if (m.loss !== undefined && (!Number.isFinite(m.loss) || m.loss < 0 || m.loss > L.maxLoss)) errors.push(`${n}: the loss must be between 0 and ${L.maxLoss}.`);
    if (m.loss && m.kind !== 'scam') errors.push(`${n}: only a scam can cost money.`);

    if (m.kind === 'scam' && m.flags.length === 0) errors.push(`${n} is a scam but has no red flag marked. Select the words that give it away.`);
    if (m.kind === 'genuine' && m.flags.length > 0) errors.push(`${n} is real, so it should have no red flags.`);
    if (m.flags.length > L.flagsPerMessage) errors.push(`${n}: use at most ${L.flagsPerMessage} red flags.`);

    const sorted = [...m.flags].sort((a, b) => a.start - b.start);
    sorted.forEach((f, j) => {
      if (!FLAG_KINDS.includes(f.kind)) errors.push(`${n}: unknown red-flag type.`);
      if (!Number.isInteger(f.start) || !Number.isInteger(f.end) || f.start < 0 || f.end > m.body.length || f.start >= f.end) errors.push(`${n}: a red flag points outside the text.`);
      if (j > 0 && f.start < (sorted[j - 1] as CustomFlag).end) errors.push(`${n}: two red flags overlap. Mark each part once.`);
      checkField(`${n} red-flag reason`, f.why, L.why, true, errors);
    });
  });

  if (JSON.stringify(body).length > L.maxBytes) errors.push('This scenario is too large. Shorten some messages.');
  return errors;
}
