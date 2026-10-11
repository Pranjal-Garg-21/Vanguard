/** UC-FAC-02: unlock stages and Arcade sections, choose a session focus. */
import { useEffect, useState } from 'react';
import { Badge, Alert, Spinner } from '@/ui';
import { Panel } from '../theme';
import { STAGES } from '@/content/stages';
import { supabaseOrThrow, type ClassRow } from '../data';

const ARCADE = [
  { id: 'arcade.everyday', name: 'Everyday Money', note: 'Open by default' },
  { id: 'arcade.safe', name: 'Stay Safe', note: 'Open by default' },
  { id: 'arcade.investing', name: 'Investing', note: 'Opens after S3 unless unlocked here' },
];

const FOCUS = [
  { id: '', name: 'No focus' },
  { id: 'everyday', name: 'Everyday Money week' },
  { id: 'safe', name: 'Stay Safe week' },
  { id: 'invest', name: 'Investing week' },
];

export function PlanTab({ cls, onFocusChange }: { cls: ClassRow; onFocusChange: (focus: string | null) => void }) {
  const [unlocked, setUnlocked] = useState<Set<string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabaseOrThrow()
      .from('unlocks')
      .select('target')
      .eq('class_id', cls.id)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setUnlocked(new Set((data ?? []).map((r: { target: string }) => r.target)));
      });
  }, [cls.id]);

  const toggle = async (target: string, on: boolean) => {
    const sb = supabaseOrThrow();
    const { error } = on
      ? await sb.from('unlocks').upsert({ class_id: cls.id, target })
      : await sb.from('unlocks').delete().eq('class_id', cls.id).eq('target', target);
    if (error) return setError(error.message);
    setUnlocked((prev) => {
      const next = new Set(prev);
      if (on) next.add(target);
      else next.delete(target);
      return next;
    });
  };

  const setFocus = async (focus: string) => {
    const value = focus || null;
    const { error } = await supabaseOrThrow().from('classes').update({ focus: value }).eq('id', cls.id);
    if (error) return setError(error.message);
    onFocusChange(value);
  };

  if (!unlocked) return <Spinner />;

  return (
    <div className="space-y-8">
      <Alert variant="info">
        Students follow the LifePath in order. Unlocking a stage opens it in the Arcade and Quick Play for the whole class. Changes reach phones
        at their next sync.
      </Alert>
      {error && <Alert variant="bad">{error}</Alert>}

      <Panel icon="flag" title="LifePath stages" subtitle="Open a stage for the whole class, for example before a workshop on it.">
        <ol className="space-y-2">
          {STAGES.map((s) => (
            <ToggleRow key={s.id} label={`${s.id} · ${s.name}`} on={unlocked.has(s.id)} onChange={(on) => toggle(s.id, on)} />
          ))}
        </ol>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
        <Panel icon="star" title="Arcade sections">
          <ul className="space-y-2">
            {ARCADE.map((a) => (
              <ToggleRow key={a.id} label={a.name} hint={a.note} on={unlocked.has(a.id)} onChange={(on) => toggle(a.id, on)} />
            ))}
          </ul>
        </Panel>

        <Panel icon="target" title="Session focus" subtitle="Shows more of one pillar in Quick Play and the Daily Challenge.">
          <div className="space-y-2">
            {FOCUS.map((f) => (
              <label key={f.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-surface-2">
                <input type="radio" name="focus" className="h-5 w-5 accent-brand" checked={(cls.focus ?? '') === f.id} onChange={() => setFocus(f.id)} />
                {f.name}
              </label>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <li className="flex min-h-12 list-none items-center gap-3 rounded-xl px-2 hover:bg-surface-2">
      <span className="flex-1">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      {on && <Badge variant="good">Unlocked</Badge>}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 rounded-full transition ${on ? 'bg-brand' : 'bg-surface-3'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-surface shadow transition-all ${on ? 'left-5.5' : 'left-0.5'}`} />
      </button>
    </li>
  );
}
