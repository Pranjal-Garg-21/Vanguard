import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Icon, Spinner, type IconName } from '@/ui';
import { supabaseOrThrow, type ClassRow } from './data';
import { InsightsTab } from './tabs/InsightsTab';
import { JoinTab } from './tabs/JoinTab';
import { PlanTab } from './tabs/PlanTab';
import { ScenariosTab } from './scenarios/ScenariosTab';
import { BackLink, Hero, Notice, Pill } from './theme';

const TABS: readonly { id: 'insights' | 'plan' | 'scenarios' | 'join'; label: string; icon: IconName }[] = [
  { id: 'insights', label: 'Insights', icon: 'target' },
  { id: 'plan', label: 'Plan', icon: 'flag' },
  { id: 'scenarios', label: 'Scenarios', icon: 'shield' },
  { id: 'join', label: 'Join code', icon: 'qr' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function ClassDetail() {
  const { id = '' } = useParams();
  const [cls, setCls] = useState<ClassRow | null | undefined>(undefined);
  const [params] = useSearchParams();
  const requested = params.get('tab');
  const firstTab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : 'insights';
  const [tab, setTab] = useState<TabId>(firstTab);

  useEffect(() => {
    supabaseOrThrow()
      .from('classes')
      .select('id, name, centre, language, join_code, expected_size, focus, created_at')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setCls(data as ClassRow | null);
      });
  }, [id]);

  if (cls === undefined) return <Spinner />;
  if (cls === null) return <Notice tone="bad">Class not found, or it belongs to another facilitator.</Notice>;

  return (
    <div className="space-y-8">
      <div className="space-y-5 print:hidden">
        <BackLink to="../.." relative="path">
          Your classes
        </BackLink>
        <Hero
          tone="blue"
          title={cls.name}
          body={
            <span className="flex flex-wrap items-center gap-2">
              {cls.centre && <span>{cls.centre}</span>}
              {cls.focus && <Pill tone="warn">Focus: {cls.focus}</Pill>}
            </span>
          }
        >
          <span className="inline-flex items-center gap-3 rounded-lg bg-white/10 px-4 py-2">
            <span className="text-xs font-semibold tracking-wider text-[#c8d0de] uppercase">Join code</span>
            <span className="font-mono text-2xl font-bold tracking-[0.25em] text-[#a3e635]">{cls.join_code}</span>
          </span>
        </Hero>

        <nav className="flex flex-wrap gap-1 rounded-xl border border-[#e3e8ef] bg-white p-1.5 shadow-sm" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition sm:flex-none ${
                tab === t.id ? 'bg-[#1c2538] text-white' : 'text-[#5b6577] hover:bg-[#eef1f6] hover:text-[#1c2538]'
              }`}
            >
              <Icon name={t.icon} className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'insights' && <InsightsTab cls={cls} />}
      {tab === 'plan' && <PlanTab cls={cls} onFocusChange={(focus) => setCls({ ...cls, focus })} />}
      {tab === 'scenarios' && <ScenariosTab cls={cls} />}
      {tab === 'join' && <JoinTab cls={cls} />}
    </div>
  );
}
