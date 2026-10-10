import { t } from '@/platform';
import { Icon } from './Icon';
import { tellReport } from './logic/runner';
import type { RunState } from './logic/types';
import { TELL_META } from './tells';

/** Found and missed red flags for one surface, each with why it matters. */
export function TellList({ state, surfaceId, tone = 'dark' }: { state: RunState; surfaceId: string; tone?: 'dark' | 'phone' }) {
  const { found, missed } = tellReport(state, surfaceId);
  const ink = tone === 'phone' ? 'text-phone-ink' : 'text-ink';
  const soft = tone === 'phone' ? 'text-phone-muted' : 'text-muted';
  if (found.length + missed.length === 0) return <p className={`text-sm ${soft}`}>{t('safe.ui.noTells')}</p>;
  return (
    <ul className="space-y-2">
      {[...found.map((x) => ({ ...x, ok: true })), ...missed.map((x) => ({ ...x, ok: false }))].map((x) => (
        <li key={x.id} className={`rounded-lg border-s-4 p-2.5 text-sm ${x.ok ? 'border-emerald-500 bg-emerald-500/10' : 'border-bad bg-bad/10'}`}>
          <p className={`flex flex-wrap items-center gap-1.5 font-bold ${ink}`}>
            <Icon name={x.ok ? 'check' : 'x'} className={`h-4 w-4 ${x.ok ? 'text-emerald-500' : 'text-bad'}`} />
            <Icon name={TELL_META[x.kind].icon} className="h-4 w-4" />
            {t(TELL_META[x.kind].nameKey)}{' '}
            <span className={`text-[11px] font-bold uppercase ${x.ok ? 'text-emerald-600' : 'text-bad'}`}>{x.ok ? t('safe.ui.found') : t('safe.ui.missed')}</span>
          </p>
          <p className={`mt-0.5 ${soft}`}>{t(x.whyKey, state.script.vars)}</p>
        </li>
      ))}
    </ul>
  );
}
