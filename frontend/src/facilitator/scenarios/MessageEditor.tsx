import { useRef, useState } from 'react';
import { FLAG_KINDS, type Channel, type FlagKind } from '@shared/custom/scenario.ts';
import { Badge, Button, Card, Icon, Notice } from '@/ui';
import { TELL_META } from '@/games/safe/phone/tells';
import { t } from '@/platform';
import { LIMITS, occurrenceAt, rangesFor, type EditorFlag, type EditorMessage } from './model';

const input = 'mt-1 w-full rounded-lg border border-line-strong bg-bg p-2.5 text-ink focus:border-brand focus:outline-none';
const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'sms', label: 'SMS' },
  { id: 'chat', label: 'Chat' },
  { id: 'mail', label: 'Email' },
];

const Count = ({ value, max }: { value: string; max: number }) => <span className={`text-xs ${value.length > max ? 'text-bad' : 'text-muted'}`}>{value.length} of {max}</span>;

/** The message with the marked words highlighted, so the author sees what students will be able to find. */
function Highlighted({ message }: { message: EditorMessage }) {
  const { found } = rangesFor(message.body, message.flags);
  const parts: React.ReactNode[] = [];
  let at = 0;
  found.forEach((f, i) => {
    if (f.start > at) parts.push(<span key={`p${i}`}>{message.body.slice(at, f.start)}</span>);
    parts.push(
      <mark key={`f${i}`} className="rounded bg-bad/25 px-0.5 text-ink underline decoration-bad decoration-wavy">
        {message.body.slice(f.start, f.end)}
      </mark>,
    );
    at = f.end;
  });
  if (at < message.body.length) parts.push(<span key="end">{message.body.slice(at)}</span>);
  return <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-sm text-ink-soft">{parts.length ? parts : 'Your message appears here.'}</p>;
}

export function MessageEditor({
  index,
  message,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  message: EditorMessage;
  total: number;
  onChange: (next: EditorMessage) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const set = (patch: Partial<EditorMessage>) => onChange({ ...message, ...patch });
  const scam = message.kind === 'scam';
  const { lost } = rangesFor(message.body, message.flags);

  const readSelection = () => {
    const el = area.current;
    if (!el) return;
    setSelection(el.selectionStart !== el.selectionEnd ? { start: el.selectionStart, end: el.selectionEnd } : null);
  };

  const markSelection = () => {
    if (!selection) return;
    const text = message.body.slice(selection.start, selection.end);
    if (!text.trim()) return setNotice('Select some words first.');
    if (message.flags.length >= LIMITS.flagsPerMessage) return setNotice(`Use at most ${LIMITS.flagsPerMessage} red flags per message.`);
    const occurrence = occurrenceAt(message.body, text, selection.start);
    const { found } = rangesFor(message.body, message.flags);
    if (found.some((f) => selection.start < f.end && selection.end > f.start)) return setNotice('Those words overlap a red flag you already marked.');
    setNotice(null);
    set({ flags: [...message.flags, { text, occurrence, kind: 'urgency', why: '' }] });
    setSelection(null);
  };

  const updateFlag = (i: number, patch: Partial<EditorFlag>) => set({ flags: message.flags.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold">Message {index + 1}</h3>
          <Badge tone={scam ? 'bad' : 'good'}>{scam ? 'Scam' : 'Real message'}</Badge>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" className="!min-h-9 !px-2" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            <Icon name="chevronDown" className="h-4 w-4 rotate-180" />
          </Button>
          <Button variant="ghost" className="!min-h-9 !px-2" aria-label="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>
            <Icon name="chevronDown" className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="!min-h-9 !px-2 !text-bad" aria-label="Remove message" onClick={onRemove}>
            <Icon name="x" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-semibold">
          Type
          <select className={input} value={message.channel} onChange={(e) => set({ channel: e.target.value as Channel })}>
            {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Is it a scam?
          <select className={input} value={message.kind} onChange={(e) => set({ kind: e.target.value as 'scam' | 'genuine' })}>
            <option value="scam">Scam</option>
            <option value="genuine">Real message</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          From <Count value={message.from} max={LIMITS.from} />
          <input className={input} value={message.from} onChange={(e) => set({ from: e.target.value })} placeholder={message.channel === 'chat' ? 'Meena (new number)' : 'AX-BNKUPD'} />
        </label>
      </div>

      {message.channel === 'mail' && (
        <label className="block text-sm font-semibold">
          Subject <Count value={message.subject} max={LIMITS.subject} />
          <input className={input} value={message.subject} onChange={(e) => set({ subject: e.target.value })} />
        </label>
      )}

      <label className="block text-sm font-semibold">
        The message <Count value={message.body} max={LIMITS.body} />
        <textarea
          ref={area}
          rows={4}
          className={input}
          value={message.body}
          onChange={(e) => set({ body: e.target.value })}
          onSelect={readSelection}
          onKeyUp={readSelection}
          onMouseUp={readSelection}
          placeholder="Write it the way a real one would be written. Use made-up names, and fake links that end in .example."
        />
      </label>

      {scam ? (
        <div className="space-y-3 rounded-lg border border-line bg-surface-2/50 p-3">
          <p className="text-sm font-semibold">Mark the words that give it away</p>
          <p className="text-xs text-muted">Select words in the box above, then press the button. Students find these with the Scam Lens.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" className="!min-h-9 text-sm" disabled={!selection} onClick={markSelection}>
              <Icon name="flag" className="h-4 w-4" />
              Mark selected words as a red flag
            </Button>
            {selection && <span className="text-xs text-muted">{message.body.slice(selection.start, selection.end).length} characters selected</span>}
          </div>
          {notice && <Notice tone="warn">{notice}</Notice>}
          <Highlighted message={message} />
          {lost.length > 0 && <Notice tone="warn">You changed the text, so {lost.length === 1 ? 'a marked phrase is' : `${lost.length} marked phrases are`} no longer in the message: {lost.map((f) => `"${f.text}"`).join(', ')}. Mark them again or remove them.</Notice>}

          <div className="space-y-3">
            {message.flags.map((f, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-line bg-surface p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Words</p>
                  <p className="font-medium">&ldquo;{f.text}&rdquo;</p>
                  <select className={input} value={f.kind} onChange={(e) => updateFlag(i, { kind: e.target.value as FlagKind })} aria-label="Type of red flag">
                    {FLAG_KINDS.map((k) => <option key={k} value={k}>{t(TELL_META[k].nameKey)}</option>)}
                  </select>
                </div>
                <label className="block text-sm font-semibold">
                  Why is this a warning sign? <Count value={f.why} max={LIMITS.why} />
                  <input className={input} value={f.why} onChange={(e) => updateFlag(i, { why: e.target.value })} placeholder="A real bank never asks you to hurry." />
                </label>
                <Button variant="ghost" className="!min-h-9 !text-bad" aria-label="Remove red flag" onClick={() => set({ flags: message.flags.filter((_, j) => j !== i) })}>
                  <Icon name="x" className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Notice tone="info">A real message has no red flags. Explain below why it can be trusted.</Notice>
      )}

      <label className="block text-sm font-semibold">
        {scam ? 'Why is this a scam?' : 'Why is this real?'} <Count value={message.explain} max={LIMITS.explain} />
        <textarea rows={2} className={input} value={message.explain} onChange={(e) => set({ explain: e.target.value })} />
      </label>

      {scam && (
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <label className="block text-sm font-semibold">
            Money lost if opened, in rupees (optional)
            <input className={input} inputMode="numeric" value={message.loss} onChange={(e) => set({ loss: e.target.value.replace(/[^0-9,]/g, '') })} placeholder="2000" />
          </label>
          <label className="block text-sm font-semibold">
            What would have happened? (optional) <Count value={message.consequence} max={LIMITS.consequence} />
            <input className={input} value={message.consequence} onChange={(e) => set({ consequence: e.target.value })} placeholder="You paid, and the loan never came." />
          </label>
        </div>
      )}
    </Card>
  );
}
