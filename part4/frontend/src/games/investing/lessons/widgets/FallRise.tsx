/**
 * Explore widget: drag how far a price falls and watch how big a rise you need to win it back.
 * Maths lives in logic/explore.ts (fallAndRise).
 */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { fallAndRise } from '../logic/explore';

export function FallRise({ start, fall: initialFall }: { start: number; fall: number }) {
  const [fallPct, setFallPct] = useState(Math.round(initialFall * 100));
  const fall = fallPct / 100;
  const { afterFall, needGain, afterSameRise } = fallAndRise(start, fall);
  const width = (n: number) => `${Math.max(2, (n / start) * 100)}%`;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <label htmlFor="fall-slider" className="text-ink-soft">
            {t('investui.fallrise.fall')}
          </label>
          <span className="font-bold text-bad">{formatValue(fall, 'percent')}</span>
        </div>
        <input
          id="fall-slider"
          type="range"
          className="h-3 w-full cursor-pointer accent-bad"
          min={0}
          max={90}
          step={5}
          value={fallPct}
          onChange={(e) => setFallPct(Number(e.target.value))}
        />
      </div>

      <div className="space-y-2" aria-hidden="true">
        <Bar label={t('investui.fallrise.start')} value={formatRupees(start)} width="100%" colour="bg-muted" />
        <Bar label={t('investui.fallrise.after')} value={formatRupees(afterFall)} width={width(afterFall)} colour="bg-bad" />
        <Bar
          label={t('investui.fallrise.same', { fall: formatValue(fall, 'percent') })}
          value={formatRupees(afterSameRise)}
          width={width(afterSameRise)}
          colour="bg-warn"
        />
      </div>

      <div className="rounded-lg bg-surface-2 p-4 text-center" aria-live="polite">
        <div className="text-sm text-ink-soft">{t('investui.fallrise.needed')}</div>
        <div className="text-4xl font-bold text-brand">{formatValue(needGain, 'percent')}</div>
      </div>
    </div>
  );
}

function Bar({ label, value, width, colour }: { label: string; value: string; width: string; colour: string }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-xs text-ink-soft">
        <span>{label}</span>
        <span className="font-bold text-ink">{value}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-surface-3">
        <div className={`h-3 rounded-full transition-all ${colour}`} style={{ width }} />
      </div>
    </div>
  );
}
