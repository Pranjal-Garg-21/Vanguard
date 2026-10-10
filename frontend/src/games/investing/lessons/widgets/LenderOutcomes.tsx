/** Lab: one lender, two endings. Shows why a higher promise is not a free bonus. Maths in logic/explore.ts (lenderOutcomes). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { lenderOutcomes } from '../logic/explore';
import { LabSlider, Readout } from './controls';

export function LenderOutcomes({ amount, rate: r0, recovery: c0 }: { amount: number; rate: number; recovery: number }) {
  const [ratePct, setRatePct] = useState(Math.round(r0 * 100));
  const [recoveryPct, setRecoveryPct] = useState(Math.round(c0 * 100));
  const o = lenderOutcomes(amount, ratePct / 100, recoveryPct / 100);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('investui.lend.intro', { amount: formatRupees(amount) })}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <LabSlider id="lo-rate" label={t('investui.lend.rate')} shown={formatValue(ratePct / 100, 'percent')} min={5} max={40} step={1} value={ratePct} onChange={setRatePct} />
        <LabSlider id="lo-rec" label={t('investui.lend.recovery')} shown={formatValue(recoveryPct / 100, 'percent')} min={0} max={100} step={10} value={recoveryPct} onChange={setRecoveryPct} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <div className="space-y-2 rounded-lg border border-line p-3">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('investui.lend.paid')}</div>
          <Readout label={t('investui.lend.gain')} value={formatRupees(o.gainIfPaid)} tone="good" />
        </div>
        <div className="space-y-2 rounded-lg border border-line p-3">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('investui.lend.fails')}</div>
          <Readout label={t('investui.lend.back')} value={formatRupees(o.backIfFails)} />
          <Readout label={t('investui.lend.net')} value={formatRupees(o.netIfFails)} tone={o.netIfFails < 0 ? 'bad' : 'plain'} />
        </div>
      </div>
    </div>
  );
}
