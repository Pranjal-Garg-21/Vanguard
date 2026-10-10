/**
 * Explore widget: simple vs compound interest. Drag the rate and the years and watch the lines pull apart.
 * Maths lives in logic/explore.ts (growthSeries).
 */
import { useState } from 'react';
import { t } from '@/platform';
import { formatRupees, formatValue } from '../logic/calc';
import { growthSeries } from '../logic/explore';

const W = 320;
const H = 170;
const PAD = { left: 8, right: 8, top: 12, bottom: 20 };

export function SimpleVsCompound({ principal, rate: initialRate, years: initialYears }: { principal: number; rate: number; years: number }) {
  const [ratePct, setRatePct] = useState(Math.round(initialRate * 100));
  const [years, setYears] = useState(initialYears);
  const series = growthSeries(principal, ratePct / 100, years);
  const last = series[series.length - 1]!;
  const yMax = Math.max(last.compound, principal * 1.05);

  const x = (year: number) => PAD.left + (year / years) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - ((v - principal) / (yMax - principal || 1)) * (H - PAD.top - PAD.bottom);
  const line = (pick: (p: (typeof series)[number]) => number) =>
    series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.year).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(' ');
  const gap = `${line((p) => p.compound)} ${[...series]
    .reverse()
    .map((p) => `L${x(p.year).toFixed(1)},${y(p.simple).toFixed(1)}`)
    .join(' ')} Z`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Slider id="scp-rate" label={t('investui.scp.rate')} value={`${ratePct}%`} min={1} max={20} step={1} current={ratePct} onChange={setRatePct} />
        <Slider id="scp-years" label={t('investui.scp.years')} value={String(years)} min={1} max={30} step={1} current={years} onChange={setYears} />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl bg-slate-50"
        role="img"
        aria-label={t('investui.scp.summary', {
          years,
          simple: formatRupees(last.simple),
          compound: formatRupees(last.compound),
          extra: formatRupees(last.compound - last.simple),
        })}
      >
        <path d={gap} className="fill-teal-200/70" />
        <path d={line((p) => p.simple)} className="fill-none stroke-slate-500" strokeWidth="2.5" strokeDasharray="5 4" />
        <path d={line((p) => p.compound)} className="fill-none stroke-teal-700" strokeWidth="3" />
        <text x={PAD.left} y={H - 5} className="fill-slate-500" fontSize="10">0</text>
        <text x={W - PAD.right} y={H - 5} textAnchor="end" className="fill-slate-500" fontSize="10">{years}</text>
      </svg>

      <div className="flex gap-4 text-sm">
        <Legend className="bg-slate-500" label={t('investui.scp.simple')} value={formatRupees(last.simple)} />
        <Legend className="bg-teal-700" label={t('investui.scp.compound')} value={formatRupees(last.compound)} />
      </div>

      <p className="rounded-xl bg-teal-50 p-3 text-center text-sm text-teal-900" aria-live="polite">
        {t('investui.scp.extra')}: <strong>{formatRupees(last.compound - last.simple)}</strong> ({formatValue(ratePct / 100, 'percent')} for {years} years)
      </p>
    </div>
  );
}

function Slider(props: { id: string; label: string; value: string; min: number; max: number; step: number; current: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <label htmlFor={props.id} className="text-slate-600">{props.label}</label>
        <span className="font-bold text-teal-800">{props.value}</span>
      </div>
      <input
        id={props.id}
        type="range"
        className="h-3 w-full cursor-pointer accent-teal-700"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.current}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Legend({ className, label, value }: { className: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded-full ${className}`} />
      <span className="text-slate-600">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
