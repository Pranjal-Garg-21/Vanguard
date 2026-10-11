/** Two small SVG charts for the Mutual Fund Challenge: lines over the years, and units bought each month. */
import { t } from '@/platform';
import { compactRupees, linePath, niceTicks } from '@/ui/chart-math';

const W = 640;
const H = 240;
const PAD = { top: 12, right: 12, bottom: 30, left: 52 };

export interface Series {
  label: string;
  values: number[];
  stroke: string;
  dashed?: boolean;
}

/** Lines over time (month 0 to the end). The legend names every line, so colour is never the only signal. */
export function LineChart({ series, title, format = compactRupees }: { series: Series[]; title: string; format?: (n: number) => string }) {
  const months = Math.max(...series.map((s) => s.values.length)) - 1;
  const ticks = niceTicks(Math.max(...series.flatMap((s) => s.values)));
  const top = ticks[ticks.length - 1] ?? 1;
  const x = (m: number) => PAD.left + (m / Math.max(1, months)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / top) * (H - PAD.top - PAD.bottom);
  const years = months / 12;
  const step = years > 12 ? 5 : years > 6 ? 2 : 1;
  const yearTicks = Array.from({ length: Math.floor(years / step) + 1 }, (_, i) => i * step);

  return (
    <figure className="space-y-2">
      <figcaption className="font-bold text-ink">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-surface-2" role="img" aria-label={`${title}: ${series.map((s) => s.label).join(', ')}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted)">
              {format(v)}
            </text>
          </g>
        ))}
        {yearTicks.map((yr) => (
          <text key={yr} x={x(yr * 12)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={11} fill="var(--color-muted)">
            {yr}
          </text>
        ))}
        <text x={(PAD.left + W - PAD.right) / 2} y={H - 3} textAnchor="middle" fontSize={11} fill="var(--color-muted)">
          {t('mutualfund.chart.years')}
        </text>
        {series.map((s) => (
          <path key={s.label} d={linePath(s.values, x, y)} fill="none" stroke={s.stroke} strokeWidth={s.dashed ? 2 : 3} strokeDasharray={s.dashed ? '6 5' : undefined} strokeLinejoin="round" />
        ))}
      </svg>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
        {series.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="w-5 border-t-[3px]" style={{ borderColor: s.stroke, borderTopStyle: s.dashed ? 'dashed' : 'solid' }} />
            {s.label}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** One bar per month: how many units the same rupees bought. Tall bars are the cheap months. */
export function UnitsBars({ units, title }: { units: number[]; title: string }) {
  const max = Math.max(...units, 1);
  const bw = (W - PAD.left - PAD.right) / units.length;
  return (
    <figure className="space-y-2">
      <figcaption className="font-bold text-ink">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H - 70}`} className="w-full rounded-lg bg-surface-2" role="img" aria-label={`${title}: ${units.length} months, between ${Math.min(...units).toFixed(1)} and ${max.toFixed(1)} units`}>
        {units.map((u, i) => {
          const h = (u / max) * (H - 70 - PAD.top - 8);
          return <rect key={i} x={PAD.left + i * bw + 0.5} y={H - 70 - 8 - h} width={Math.max(1, bw - 1)} height={h} fill="var(--color-brand)" fillOpacity={0.75} />;
        })}
        <text x={PAD.left - 6} y={PAD.top + 8} textAnchor="end" fontSize={11} fill="var(--color-muted)">
          {max.toFixed(1)}
        </text>
        <text x={PAD.left - 6} y={H - 70 - 8} textAnchor="end" fontSize={11} fill="var(--color-muted)">
          0
        </text>
      </svg>
    </figure>
  );
}
