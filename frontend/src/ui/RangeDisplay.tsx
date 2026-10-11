/**
 * Shows a projected amount as a range, never as one number.
 * Owner: P4. Part of the guardrails: every investing projection goes through this or FanChart.
 */
import { formatRupees } from '@/core/market';
import { t } from '@/platform';

export interface RangeDisplayProps {
  /** Bad-case end of the range (for example the 5th percentile). */
  low: number;
  /** Middle outcome (the median). */
  median: number;
  /** Good-case end of the range (for example the 95th percentile). */
  high: number;
  /** Override the line under the range, e.g. to say how many futures it covers. */
  confidenceKey?: string;
  className?: string;
}

export function RangeDisplay({ low, median, high, confidenceKey = 'assume.range.confidence', className = '' }: RangeDisplayProps) {
  // Guard against a caller passing the ends the wrong way round.
  const lo = Math.min(low, median, high);
  const hi = Math.max(low, median, high);
  const mid = Math.min(hi, Math.max(lo, median));
  const span = hi - lo;
  const midPct = span > 0 ? ((mid - lo) / span) * 100 : 50;
  const middleText = t('assume.range.middle', { median: formatRupees(mid) });

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-xl font-bold text-ink">{t('assume.range', { low: formatRupees(lo), high: formatRupees(hi) })}</p>
      <div className="relative h-3 rounded-full bg-brand/30" role="img" aria-label={middleText}>
        <span
          className="absolute top-1/2 h-5 w-1.5 -translate-y-1/2 rounded-full bg-ink ring-2 ring-bg"
          style={{ insetInlineStart: `calc(${midPct}% - 3px)` }}
        />
      </div>
      <div className="flex justify-between gap-2 text-sm text-ink-soft">
        <span>{formatRupees(lo)}</span>
        <span className="font-bold text-ink">{middleText}</span>
        <span>{formatRupees(hi)}</span>
      </div>
      <p className="text-xs text-muted">{t(confidenceKey)}</p>
    </div>
  );
}
