/**
 * The builder's working copy of a scenario, and how it converts to and from
 * what is saved. A red flag is remembered as the words themselves (plus which
 * occurrence of those words), so editing the text around it does not break it.
 * Pure. Owner: P5.
 */
import { CUSTOM_LIMITS, type Channel, type CustomInbox, type CustomMessage, type FlagKind } from '@shared/custom/scenario.ts';

export type EditorFlag = {
  /** The marked words. */
  text: string;
  /** Which occurrence of those words, counting from zero, when they appear more than once. */
  occurrence: number;
  kind: FlagKind;
  why: string;
};

export type EditorMessage = {
  id: string;
  channel: Channel;
  kind: 'scam' | 'genuine';
  from: string;
  subject: string;
  body: string;
  flags: EditorFlag[];
  explain: string;
  /** Kept as text while typing. Empty means no money is lost. */
  loss: string;
  consequence: string;
};

export type EditorScenario = {
  title: string;
  brief: string;
  concept: string;
  language: string;
  messages: EditorMessage[];
};

export const newId = () => Math.random().toString(36).slice(2, 10);

export const blankMessage = (kind: 'scam' | 'genuine' = 'scam'): EditorMessage => ({
  id: newId(),
  channel: 'sms',
  kind,
  from: '',
  subject: '',
  body: '',
  flags: [],
  explain: '',
  loss: '',
  consequence: '',
});

export const blankScenario = (): EditorScenario => ({ title: '', brief: '', concept: '', language: 'en', messages: [blankMessage('scam'), blankMessage('genuine')] });

/** Where the nth occurrence of `text` starts in `body`, or -1. */
function nthIndexOf(body: string, text: string, n: number): number {
  let at = -1;
  for (let i = 0; i <= n; i++) {
    at = body.indexOf(text, at + 1);
    if (at < 0) return -1;
  }
  return at;
}

/** Which occurrence of the selected words starts at `start`. */
export function occurrenceAt(body: string, text: string, start: number): number {
  let count = 0;
  let at = body.indexOf(text);
  while (at >= 0 && at < start) {
    count += 1;
    at = body.indexOf(text, at + 1);
  }
  return count;
}

/** Turns marked words into character ranges. Words that are no longer in the text are returned as `lost`. */
export function rangesFor(body: string, flags: EditorFlag[]) {
  const found: { start: number; end: number; kind: FlagKind; why: string; source: EditorFlag }[] = [];
  const lost: EditorFlag[] = [];
  for (const f of flags) {
    const start = f.text ? nthIndexOf(body, f.text, f.occurrence) : -1;
    if (start < 0) lost.push(f);
    else found.push({ start, end: start + f.text.length, kind: f.kind, why: f.why, source: f });
  }
  return { found: found.sort((a, b) => a.start - b.start), lost };
}

export function toInbox(messages: EditorMessage[]): CustomInbox {
  return {
    v: 1,
    messages: messages.map((m): CustomMessage => {
      const loss = Number(m.loss.replace(/[,\s]/g, ''));
      return {
        id: m.id,
        channel: m.channel,
        kind: m.kind,
        from: m.from.trim(),
        ...(m.channel === 'mail' ? { subject: m.subject.trim() } : {}),
        body: m.body,
        flags: m.kind === 'scam' ? rangesFor(m.body, m.flags).found.map(({ start, end, kind, why }) => ({ start, end, kind, why: why.trim() })) : [],
        explain: m.explain.trim(),
        ...(m.kind === 'scam' && m.loss.trim() !== '' && Number.isFinite(loss) ? { loss } : {}),
        ...(m.kind === 'scam' && m.consequence.trim() ? { consequence: m.consequence.trim() } : {}),
      };
    }),
  };
}

export function fromInbox(body: CustomInbox): EditorMessage[] {
  return body.messages.map((m) => ({
    id: m.id,
    channel: m.channel,
    kind: m.kind,
    from: m.from,
    subject: m.subject ?? '',
    body: m.body,
    flags: m.flags.map((f) => {
      const text = m.body.slice(f.start, f.end);
      return { text, occurrence: occurrenceAt(m.body, text, f.start), kind: f.kind, why: f.why };
    }),
    explain: m.explain,
    loss: m.loss === undefined ? '' : String(m.loss),
    consequence: m.consequence ?? '',
  }));
}

/** Words left in the text after a flag's own marked words are removed, so the author can see what is unmarked. */
export function counter(value: string, max: number): string {
  return `${value.length} of ${max}`;
}

export const LIMITS = CUSTOM_LIMITS;
