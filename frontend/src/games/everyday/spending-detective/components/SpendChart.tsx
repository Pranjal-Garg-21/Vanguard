/**
 * Category breakdown as a donut. Owner: P3.
 *
 * Inline SVG rather than a chart library: the plan budgets under 3 MB for first
 * load on a low-end phone (§14.4), and this is one arc per category.
 */

import { rupees, useT } from '@/platform';
import type { CategoryTotal } from '../logic/history';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SpendChart({
  totals,
  colours,
  labelKeys,
  total,
}: {
  totals: readonly CategoryTotal[];
  colours: Record<string, string>;
  labelKeys: Record<string, string>;
  total: number;
}) {
  const t = useT();

  let offset = 0;

  return (
    <figure className="spend-chart">
      <svg viewBox="0 0 140 140" role="img" aria-label={t('sm02.chart.title')}>
        <g transform="rotate(-90 70 70)">
          {totals.map((slice) => {
            const length = slice.share * CIRCUMFERENCE;
            const dash = `${length} ${CIRCUMFERENCE - length}`;
            const circle = (
              <circle
                key={slice.category}
                cx="70"
                cy="70"
                r={RADIUS}
                fill="none"
                strokeWidth="24"
                stroke={colours[slice.category] ?? 'currentColor'}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return circle;
          })}
        </g>
      </svg>

      <figcaption>
        <p className="spend-chart__total">{t('sm02.chart.total', { amount: rupees(total) })}</p>
        <ul className="spend-chart__legend">
          {totals.map((slice) => (
            <li key={slice.category}>
              <span
                className="spend-chart__swatch"
                style={{ background: colours[slice.category] }}
                aria-hidden="true"
              />
              {t(labelKeys[slice.category] ?? slice.category)}
              <span className="spend-chart__value">
                {rupees(slice.total)} · {Math.round(slice.share * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
