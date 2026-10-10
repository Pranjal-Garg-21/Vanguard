/** Lab: save the same amount each month, but start at different ages. Maths in logic/explore.ts (startEarlyResult). */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { startEarlyResult } from '../logic/explore';
import { LabBar, LabSlider, Readout } from './controls';

export function StartEarly({ monthly: m0, rate, startAge: a0, stopAge }: { monthly: number; rate: number; startAge: number; stopAge: number }) {
  const [monthly, setMonthly] = useState(m0);
  const [startAge, setStartAge] = useState(a0);
  const you = startEarlyResult(monthly, rate, startAge, stopAge);
  const best = startEarlyResult(monthly, rate, 18, stopAge);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <LabSlider id="se-age" label={t('investui.startearly.age')} shown={String(startAge)} min={18} max={50} step={1} value={startAge} onChange={setStartAge} />
        <LabSlider id="se-monthly" label={t('investui.startearly.monthly')} shown={formatRupees(monthly)} min={100} max={2000} step={100} value={monthly} onChange={setMonthly} />
      </div>
      <p className="text-sm text-ink-soft">{t('investui.startearly.assume', { rate: formatValue(rate, 'percent'), stop: stopAge })}</p>
      <div aria-hidden="true">
        <LabBar label={t('investui.startearly.putin')} value={formatRupees(you.putIn)} fraction={best.putIn ? you.putIn / best.putIn : 0} colour="bg-muted" />
        <div className="h-2" />
        <LabBar label={t('investui.startearly.final')} value={formatRupees(you.finalAmount)} fraction={best.finalAmount ? you.finalAmount / best.finalAmount : 0} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <Readout label={t('investui.startearly.putin')} value={formatRupees(you.putIn)} />
        <Readout label={t('investui.startearly.final')} value={formatRupees(you.finalAmount)} tone="good" />
      </div>
    </div>
  );
}
