import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Alert, Spinner } from '@/ui';
import { supabaseOrThrow, type ClassRow } from './data';
import { InsightsTab } from './tabs/InsightsTab';
import { JoinTab } from './tabs/JoinTab';
import { PlanTab } from './tabs/PlanTab';

const TABS = [
  { id: 'insights', label: 'Insights' },
  { id: 'plan', label: 'Plan' },
  { id: 'join', label: 'Join code' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function ClassDetail() {
  const { id = '' } = useParams();
  const [cls, setCls] = useState<ClassRow | null | undefined>(undefined);
  const [tab, setTab] = useState<TabId>('insights');

  useEffect(() => {
    supabaseOrThrow()
      .from('classes')
      .select('id, name, centre, language, join_code, expected_size, focus, created_at')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as ClassRow | null;
        setCls(row);
        if (row) setTab('insights');
      });
  }, [id]);

  if (cls === undefined) return <Spinner />;
  if (cls === null) return <Alert variant="bad">Class not found, or it belongs to another facilitator.</Alert>;

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <Link to="../.." relative="path" className="text-sm font-semibold text-brand">
          ← Your classes
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{cls.name}</h1>
            {cls.centre && <p className="text-muted">{cls.centre}</p>}
          </div>
          <span className="rounded-xl bg-surface px-3 py-2 font-mono text-xl font-bold tracking-widest">{cls.join_code}</span>
        </div>

        <nav className="mt-5 flex gap-1 border-b border-line" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px min-h-11 border-b-2 px-4 font-semibold ${
                tab === t.id ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'insights' && <InsightsTab cls={cls} />}
      {tab === 'plan' && <PlanTab cls={cls} onFocusChange={(focus) => setCls({ ...cls, focus })} />}
      {tab === 'join' && <JoinTab cls={cls} />}
    </div>
  );
}
