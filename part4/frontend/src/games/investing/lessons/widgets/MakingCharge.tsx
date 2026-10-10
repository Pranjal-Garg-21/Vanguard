/** Lab: jewellery bought with a making charge. How far must the gold price rise to get your money back? Maths in logic/explore.ts (goldOutcome). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { goldOutcome } from '../logic/explore';
import { LabSlider, Readout } from './controls';

export function MakingCharge({ price, charge: c0 }: { price: number; charge: number }) {
  const [chargePct, setChargePct] = useState(Math.round(c0 * 100));
  const [changePct, setChangePct] = useState(0);
  const o = goldOutcome(price, chargePct / 100, changePct / 100);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.gold.intro', { price: formatRupees(price) })}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <LabSlider id="mc-charge" label={t('investui.gold.charge')} shown={`${chargePct}%`} min={0} max={25} step={1} value={chargePct} onChange={setChargePct} />
        <LabSlider id="mc-change" label={t('investui.gold.change')} shown={`${changePct > 0 ? '+' : ''}${changePct}%`} min={-20} max={30} step={5} value={changePct} onChange={setChangePct} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <Readout label={t('investui.gold.chargePaid')} value={formatRupees(o.chargePaid)} tone="bad" />
        <Readout label={t('investui.gold.content')} value={formatRupees(o.goldContent)} />
        <Readout label={t('investui.gold.sell')} value={formatRupees(o.sellValue)} />
        <Readout label={t('investui.gold.result')} value={formatRupees(o.result)} tone={o.result < 0 ? 'bad' : 'good'} />
      </div>
      <p className="text-sm text-ink-soft">{t('investui.gold.breakeven', { rise: formatValue(o.breakeven, 'percent', 1) })}</p>
    </div>
  );
}
