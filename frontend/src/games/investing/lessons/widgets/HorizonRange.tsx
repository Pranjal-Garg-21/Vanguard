/** Lab: the same lump sum on one path over different waiting times, across 500 simulated futures. Maths in logic/explore.ts (horizonRange). */
import { useMemo, useState } from 'react';
import { t } from '@/platform';
import { RangeDisplay } from '@/ui';
import { formatRupees, formatValue } from '../logic/calc';
import { horizonRange } from '../logic/explore';
import { LabSlider, Readout } from './controls';

const PATHS = ['steady_box', 'mixed_basket', 'bumpy_ride'] as const;

export function HorizonRange({ amount }: { amount: number }) {
  const [path, setPath] = useState<(typeof PATHS)[number]>('bumpy_ride');
  const [years, setYears] = useState(2);
  const r = useMemo(() => horizonRange(amount, path, years), [amount, path, years]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.hor.intro', { amount: formatRupees(amount) })}</p>
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
      <LabSlider id="hr-years" label={t('investui.hor.years')} shown={String(years)} min={1} max={20} step={1} value={years} onChange={setYears} />
      <div className="space-y-3" aria-live="polite">
        <RangeDisplay low={r.low} median={r.median} high={r.high} />
        <Readout label={t('investui.hor.loss')} value={formatValue(r.lossChance, 'percent')} tone={r.lossChance > 0.1 ? 'bad' : 'plain'} />
      </div>
      <p className="text-xs text-muted">{t('investui.hor.note')}</p>
    </div>
  );
}
