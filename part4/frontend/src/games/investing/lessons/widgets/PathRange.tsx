/** Lab: pick a path and see where money could end after one typical year. Maths in logic/explore.ts (pathRange). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees } from '../logic/calc';
import { pathRange } from '../logic/explore';
import { Readout } from './controls';

const PATHS = ['steady_box', 'mixed_basket', 'bumpy_ride'] as const;

export function PathRange({ amount }: { amount: number }) {
  const [path, setPath] = useState<(typeof PATHS)[number]>('steady_box');
  const r = pathRange(amount, path);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.path.intro', { amount: formatRupees(amount) })}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('investui.path.pick')}>
        {PATHS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === path}
            onClick={() => setPath(id)}
            className={`min-h-11 rounded-lg border px-3 text-sm font-bold transition-colors ${
              id === path ? 'border-brand bg-brand/15 text-brand' : 'border-line-strong text-ink-soft hover:border-brand'
            }`}
          >
            {t(`asset.${id}`)}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        <Readout label={t('investui.path.low')} value={formatRupees(r.low)} />
        <Readout label={t('investui.path.high')} value={formatRupees(r.high)} tone="good" />
        <Readout label={t('investui.path.width')} value={formatRupees(r.width)} />
      </div>
      <p className="text-xs text-muted">{t('investui.path.note')}</p>
    </div>
  );
}
