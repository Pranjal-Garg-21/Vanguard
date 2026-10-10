/** Lab: why "recruit your friends" schemes must collapse. Maths in logic/explore.ts (pyramidGrowth). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatValue } from '../logic/calc';
import { pyramidGrowth } from '../logic/explore';
import { LabSlider, Readout } from './controls';

const count = (n: number) => new Intl.NumberFormat('en-IN').format(Math.round(n));

export function PyramidGrowth({ recruits: r0, town }: { recruits: number; town: number }) {
  const [recruits, setRecruits] = useState(r0);
  const [level, setLevel] = useState(1);
  const g = pyramidGrowth(recruits, level);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.pyr.intro')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <LabSlider id="py-recruits" label={t('investui.pyr.recruits')} shown={String(recruits)} min={2} max={5} step={1} value={recruits} onChange={setRecruits} />
        <LabSlider id="py-level" label={t('investui.pyr.level')} shown={String(level)} min={1} max={12} step={1} value={level} onChange={setLevel} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        <Readout label={t('investui.pyr.atLevel')} value={count(g.atLevel)} />
        <Readout label={t('investui.pyr.total')} value={count(g.total)} />
        <Readout
          label={t('investui.pyr.town', { town: count(town) })}
          value={g.total > town ? t('investui.pyr.more') : formatValue(g.total / town, 'percent')}
          tone={g.total > town ? 'bad' : 'plain'}
        />
      </div>
    </div>
  );
}
