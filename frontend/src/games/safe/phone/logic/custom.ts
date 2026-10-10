/**
 * Turns a facilitator's scenario into the script the phone plays. Pure: it
 * returns the script and the text it needs, and the caller registers the text.
 * Owner: P5.
 *
 * The facilitator wrote one plain-text body per message and marked red flags as
 * ranges. Here each body is cut at those ranges, every cut piece becomes a
 * text segment, and each flagged piece becomes something the Scam Lens can
 * inspect. The result plays exactly like the built-in Scam Inbox.
 */
import type { CustomMessage, CustomScenarioRow } from '@shared/custom/scenario.ts';
import { responseActions } from './inbox';
import type { Lens, Scenario, Segment, Step, Surface, Tell } from './types';

export type BuiltCustom = { scenario: Scenario; strings: Record<string, string> };

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'sender';

/** Cuts the body at the flagged ranges: [plain, flagged, plain, ...], empty pieces dropped. */
export function splitBody(message: CustomMessage): { text: string; flag: number | null }[] {
  const flags = message.flags.map((f, index) => ({ f, index })).sort((a, b) => a.f.start - b.f.start);
  const pieces: { text: string; flag: number | null }[] = [];
  let at = 0;
  for (const { f, index } of flags) {
    if (f.start > at) pieces.push({ text: message.body.slice(at, f.start), flag: null });
    pieces.push({ text: message.body.slice(f.start, f.end), flag: index });
    at = f.end;
  }
  if (at < message.body.length) pieces.push({ text: message.body.slice(at), flag: null });
  return pieces.filter((p) => p.text.length > 0);
}

export function buildCustomInbox(row: CustomScenarioRow): BuiltCustom {
  const prefix = `custom.${row.id}`;
  const strings: Record<string, string> = {
    [`${prefix}.title`]: row.title,
    [`${prefix}.brief`]: row.brief,
  };
  const steps: Step[] = [];
  let at = 1200;

  row.body.messages.forEach((m, i) => {
    const id = `m${i}`;
    const key = (part: string) => `${prefix}.${id}.${part}`;

    const lens: Lens[] = [];
    const tells: Tell[] = [];
    const body: Segment[] = splitBody(m).map((piece, j) => {
      strings[key(`p${j}`)] = piece.text;
      if (piece.flag === null) return { k: key(`p${j}`) };
      const flag = m.flags[piece.flag]!;
      strings[key(`w${piece.flag}`)] = flag.why;
      lens.push({ id: `f${piece.flag}`, revealKey: key(`w${piece.flag}`), tell: `t${piece.flag}` });
      tells.push({ id: `t${piece.flag}`, kind: flag.kind, whyKey: key(`w${piece.flag}`) });
      return { k: key(`p${j}`), lens: `f${piece.flag}` };
    });
    strings[key('explain')] = m.explain;

    const hasWhatIf = m.kind === 'scam' && !!m.consequence;
    const common = {
      concept: row.concept,
      respond: true,
      genuine: m.kind === 'genuine',
      explainKey: key('explain'),
      actions: responseActions({ id, kind: m.kind, loss: m.loss, whatIf: hasWhatIf }),
      ...(lens.length > 0 ? { lens, tells } : {}),
    };

    let surface: Surface;
    if (m.channel === 'mail') {
      strings[key('subject')] = m.subject ?? '';
      surface = { type: 'mail', fromName: m.from, fromAddress: `${slug(m.from)}@mail.example`, subjectKey: key('subject'), body, ...common };
    } else if (m.channel === 'chat') {
      surface = { type: 'chat', from: m.from, online: true, body, ...common };
    } else {
      surface = { type: 'sms', from: m.from, body, ...common };
    }
    steps.push({ id, at, surface });

    if (hasWhatIf) {
      strings[key('consequence')] = m.consequence as string;
      steps.push({
        id: `${id}__whatif`,
        surface: {
          type: 'page',
          url: '',
          titleKey: 'safe.whatif.title',
          foreground: true,
          concept: row.concept,
          body: [{ k: key('consequence') }],
          actions: [{ id: 'continue', labelKey: 'safe.inbox.next', risk: 'neutral', close: true }],
        },
      });
    }
    at += 2000;
  });

  const scenario: Scenario = {
    id: `custom_${row.id}`,
    simulator: 'custom',
    mode: 'act',
    concepts: [row.concept],
    level: 2,
    titleKey: `${prefix}.title`,
    briefKey: `${prefix}.brief`,
    phone: { startBalance: 5000, startTime: '09:00', clockRate: 20 },
    objectives: [
      { id: 'o1', textKey: 'safe.inbox.o1', when: 'read:1' },
      { id: 'o2', textKey: 'safe.inbox.o2', when: 'inspectedAny:1' },
      { id: 'o3', textKey: 'safe.inbox.o3', when: 'ended' },
    ],
    steps,
  };
  return { scenario, strings };
}
