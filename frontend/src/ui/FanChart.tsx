/**
 * The fan chart: a wide band for most futures, a narrower band for the middle half, a median line
 * and a dashed line for the money you put in. Plain SVG, so it stays light on low-end phones.
 * Owner: P4. Part of the guardrails.
 *
 * Colour is never the only signal: the median is a solid line, the money put in is dashed, and
 * a legend names every mark. A text summary is available to screen readers.
 */
import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { formatRupees, formatValue, type Percentiles } from '@/core/market';
import { t } from '@/platform';
import { bandPath, compactRupees, deflate, linePath, niceTicks } from './chart-math';

export interface FanChartProps {
  percentiles: Percentiles;
  /** Money put in at each month (same length as the percentiles). */
  invested: number[];
  /** When given, shows an "Adjust for inflation" toggle that restates every amount in today's money. */
  inflation?: number;
  /** Where to send a student who wants the full lesson on inflation. */
  learnMoreHref?: string;
  className?: string;
}

const W = 640;
const H = 300;
const PAD = { top: 12, right: 12, bottom: 34, left: 52 };

export function FanChart({ percentiles, invested, inflation, learnMoreHref, className = '' }: FanChartProps) {
  const [real, setReal] = useState(false);
  const descId = useId();
  const adjust = (series: number[]) => (real && inflation !== undefined ? deflate(series, inflation) : series);

  const p5 = adjust(percentiles.p5);
  const p25 = adjust(percentiles.p25);
  const p50 = adjust(percentiles.p50);
  const p75 = adjust(percentiles.p75);
  const p95 = adjust(percentiles.p95);
  const put = adjust(invested);

  const months = p50.length - 1;
  const ticks = niceTicks(Math.max(...p95, ...put));
  const top = ticks[ticks.length - 1] ?? 1;
  const x = (m: number) => PAD.left + (m / Math.max(1, months)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / top) * (H - PAD.top - PAD.bottom);

  const years = months / 12;
  const stepYears = years > 12 ? 5 : years > 6 ? 2 : 1;
  const yearTicks = Array.from({ length: Math.floor(years / stepYears) + 1 }, (_, i) => i * stepYears);

  const alt = t('assume.chart.alt', {
    years: Number(years.toFixed(1)),
    invested: formatRupees(put[months] ?? 0),
    low: formatRupees(p5[months] ?? 0),
    high: formatRupees(p95[months] ?? 0),
    median: formatRupees(p50[months] ?? 0),
  });

  return (
    <figure className={`space-y-3 ${className}`}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-ink">{t('assume.chart.title')}</span>
        {inflation !== undefined && (
          <button
            type="button"
            role="switch"
            aria-checked={real}
            onClick={() => setReal((r) => !r)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm font-bold text-ink-soft hover:border-brand"
          >
            <span className={`h-4 w-4 rounded-sm border-2 ${real ? 'border-brand bg-brand' : 'border-line-strong'}`} aria-hidden="true" />
            {t('assume.chart.real.toggle')}
          </button>
        )}
      </figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-surface-2" role="img" aria-describedby={descId}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted)">
              {compactRupees(v)}
            </text>
          </g>
        ))}
        {yearTicks.map((yr) => (
          <text key={yr} x={x(yr * 12)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={11} fill="var(--color-muted)">
            {yr}
          </text>
        ))}
        <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} textAnchor="middle" fontSize={11} fill="var(--color-muted)">
          {t('assume.chart.axis.years')}
        </text>

        <path d={bandPath(p5, p95, x, y)} fill="var(--color-brand)" fillOpacity={0.18} />
        <path d={bandPath(p25, p75, x, y)} fill="var(--color-brand)" fillOpacity={0.32} />
        <path d={linePath(put, x, y)} fill="none" stroke="var(--color-ink-soft)" strokeWidth={2} strokeDasharray="6 5" />
        <path d={linePath(p50, x, y)} fill="none" stroke="var(--color-brand)" strokeWidth={3} />
      </svg>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
        <LegendItem swatch={<span className="h-3 w-5 rounded-sm bg-brand/20" />} label={t('assume.chart.legend.wide')} />
        <LegendItem swatch={<span className="h-3 w-5 rounded-sm bg-brand/40" />} label={t('assume.chart.legend.mid')} />
        <LegendItem swatch={<span className="w-5 border-t-[3px] border-brand" />} label={t('assume.chart.legend.median')} />
        <LegendItem swatch={<span className="w-5 border-t-2 border-dashed border-ink-soft" />} label={t('assume.chart.legend.invested')} />
      </ul>
      {inflation !== undefined && (
        <div className="space-y-2 rounded-lg border-l-4 border-info bg-surface-2 p-3 text-sm text-ink-soft" aria-live="polite">
          {real ? (
            <>
              <p className="font-bold text-ink">{t('assume.real.title')}</p>
              <p>{t('assume.real.why', { rate: formatValue(inflation, 'percent', 1), years: Number(years.toFixed(1)), worth: formatRupees(1 / Math.pow(1 + inflation, years), 2) })}</p>
              <p>{t('assume.real.end', { nominal: formatRupees(percentiles.p50[months] ?? 0), real: formatRupees(p50[months] ?? 0) })}</p>
              <p>{t('assume.real.dashed')}</p>
              <p>{t('assume.real.slow')}</p>
            </>
          ) : (
            <p>{t('assume.real.hint')}</p>
          )}
          {learnMoreHref && (
            <Link to={learnMoreHref} className="inline-block font-bold text-brand hover:underline">
              {t('assume.real.learn')}
            </Link>
          )}
        </div>
      )}
      <p id={descId} className="sr-only">
        {alt} {real ? t('assume.chart.real.on') : t('assume.chart.real.off')}
      </p>
    </figure>
  );
}

function LegendItem({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {swatch}
      {label}
    </li>
  );
}
