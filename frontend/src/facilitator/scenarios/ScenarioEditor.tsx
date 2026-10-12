import { useMemo, useState } from 'react';
import { validateCustom, type CustomScenarioRow } from '@shared/custom/scenario.ts';
import { Button, Card, Icon } from '@/ui';
import { Notice } from '../theme';
import concepts from '@/content/facilitator/concepts.json';
import { buildCustomInbox } from '@/games/safe/phone/logic/custom';
import { PhoneRoom } from '@/games/safe/phone/PhoneRoom';
import { registerStrings } from '@/platform';
import { saveScenario, type ScenarioRow } from './api';
import { MessageEditor } from './MessageEditor';
import { blankMessage, blankScenario, fromInbox, LIMITS, rangesFor, toInbox, type EditorScenario } from './model';

const input = 'mt-1 w-full rounded-lg border border-line-strong bg-bg p-2.5 text-ink focus:border-brand focus:outline-none';
const CONCEPT_IDS = Object.keys(concepts);

function fromRow(row: ScenarioRow | null): EditorScenario {
  if (!row) return blankScenario();
  return { title: row.title, brief: row.brief, concept: row.concept, language: row.language, messages: fromInbox(row.body) };
}

export function ScenarioEditor({ classId, existing, onClose, onSaved }: { classId: string; existing: ScenarioRow | null; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [draft, setDraft] = useState<EditorScenario>(() => fromRow(existing));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<CustomScenarioRow | null>(null);

  const body = useMemo(() => toInbox(draft.messages), [draft.messages]);
  const problems = useMemo(() => validateCustom({ title: draft.title, brief: draft.brief, concept: draft.concept, body }, CONCEPT_IDS), [draft, body]);
  const lostFlags = draft.messages.some((m) => m.kind === 'scam' && rangesFor(m.body, m.flags).lost.length > 0);
  const ready = problems.length === 0 && !lostFlags;

  const save = async (status: 'draft' | 'published') => {
    setBusy(true);
    setError(null);
    try {
      await saveScenario({ id: existing?.id, classId, title: draft.title, brief: draft.brief, concept: draft.concept, language: draft.language, body, status });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  };

  const preview = () => {
    const row: CustomScenarioRow = { id: 'preview', version: 1, title: draft.title, brief: draft.brief, concept: draft.concept, language: draft.language, body };
    registerStrings('en', buildCustomInbox(row).strings);
    setPreviewing(row);
  };

  if (previewing) {
    const { scenario, strings } = buildCustomInbox(previewing);
    registerStrings('en', strings);
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2">
          <p className="text-sm font-bold text-ink">Preview: this is what students see. Nothing here is saved.</p>
          <Button variant="secondary" className="!min-h-9 text-sm" onClick={() => setPreviewing(null)}>Close preview</Button>
        </div>
        <PhoneRoom script={scenario} mode="arcade" onComplete={() => setPreviewing(null)} />
      </div>
    );
  }

  const setMessage = (i: number, next: EditorScenario['messages'][number]) => setDraft({ ...draft, messages: draft.messages.map((m, j) => (j === i ? next : m)) });
  const move = (i: number, d: -1 | 1) => {
    const messages = [...draft.messages];
    const [m] = messages.splice(i, 1);
    messages.splice(i + d, 0, m!);
    setDraft({ ...draft, messages });
  };

  return (
    <div className="space-y-5">
      <div>
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
          <Icon name="arrowLeft" className="h-4 w-4" />
          All scenarios
        </button>
        <h2 className="mt-2 text-xl font-bold">{existing ? 'Edit scenario' : 'New scenario'}</h2>
      </div>

      <Card className="space-y-4">
        <label className="block font-semibold">
          Title <span className={`text-xs ${draft.title.length > LIMITS.title ? 'text-bad' : 'text-muted'}`}>{draft.title.length} of {LIMITS.title}</span>
          <input className={input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Loan messages in our area" />
        </label>
        <label className="block font-semibold">
          Introduction for students <span className={`text-xs ${draft.brief.length > LIMITS.brief ? 'text-bad' : 'text-muted'}`}>{draft.brief.length} of {LIMITS.brief}</span>
          <textarea rows={2} className={input} value={draft.brief} onChange={(e) => setDraft({ ...draft, brief: e.target.value })} placeholder="Read each message and decide how to respond. Some are real." />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block font-semibold">
            Skill this practises
            <select className={input} value={draft.concept} onChange={(e) => setDraft({ ...draft, concept: e.target.value })}>
              <option value="">Choose a skill</option>
              {CONCEPT_IDS.map((id) => <option key={id} value={id}>{(concepts as Record<string, { name: string }>)[id]?.name}</option>)}
            </select>
            <span className="block text-xs font-normal text-muted">Results appear under this skill in Insights.</span>
          </label>
          <label className="block font-semibold">
            Language the text is written in
            <input className={input} value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })} placeholder="en, te, hi, ur" maxLength={12} />
          </label>
        </div>
      </Card>

      <Notice tone="info">
        Keep it safe: use <strong>made-up names</strong> and never a real person, company or number. A fake link must end in <code>.example</code> (for example
        <code> kyc-update.example/login</code>), and phone numbers should be masked (<code>98xxx xx210</code>).
      </Notice>

      {draft.messages.map((m, i) => (
        <MessageEditor
          key={m.id}
          index={i}
          message={m}
          total={draft.messages.length}
          onChange={(next) => setMessage(i, next)}
          onMove={(d) => move(i, d)}
          onRemove={() => setDraft({ ...draft, messages: draft.messages.filter((_, j) => j !== i) })}
        />
      ))}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={draft.messages.length >= LIMITS.maxMessages} onClick={() => setDraft({ ...draft, messages: [...draft.messages, blankMessage('scam')] })}>
          <Icon name="plus" className="h-4 w-4" />
          Add a scam
        </Button>
        <Button variant="secondary" disabled={draft.messages.length >= LIMITS.maxMessages} onClick={() => setDraft({ ...draft, messages: [...draft.messages, blankMessage('genuine')] })}>
          <Icon name="plus" className="h-4 w-4" />
          Add a real message
        </Button>
      </div>

      {(problems.length > 0 || lostFlags) && (
        <Notice tone="warn">
          <p className="mb-1 font-bold">Before you can publish:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {problems.slice(0, 8).map((p) => <li key={p}>{p}</li>)}
            {lostFlags && <li>A marked phrase is no longer in its message.</li>}
          </ul>
          {problems.length > 8 && <p className="mt-1 text-xs">and {problems.length - 8} more.</p>}
        </Notice>
      )}
      {error && <Notice tone="bad">{error}</Notice>}

      <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-line bg-bg/95 py-3 backdrop-blur">
        <Button variant="secondary" disabled={!ready} onClick={preview}>Preview as a student</Button>
        <Button variant="secondary" disabled={busy || !draft.title.trim()} onClick={() => void save('draft')}>{existing ? 'Save' : 'Save as draft'}</Button>
        <Button disabled={busy || !ready} onClick={() => void save('published')}>{existing?.status === 'published' ? 'Save and keep published' : 'Publish to class'}</Button>
      </div>
    </div>
  );
}
