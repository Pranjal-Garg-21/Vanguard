/** The six companies: price, this week's move, a tiny history, what you hold, and the buy / sell controls. */
import { useState } from 'react';
import { t } from '@/platform';
import { Badge, Button, Card } from '@/ui';
import { price as fmtPrice, signedPct } from './logic/format';
import type { Company, Portfolio } from './logic/types';

const QTYS = [1, 5, 10, 25];

export interface Row {
  company: Company;
  history: number[];
  now: number;
  change: number;
  failed: boolean;
}

export function MarketTable({
  rows,
  portfolio,
  onBuy,
  onSell,
}: {
  rows: Row[];
  portfolio: Portfolio;
  onBuy: (id: string, qty: number) => void;
  onSell: (id: string, qty: number) => void;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const id = r.company.id;
        const q = qty[id] ?? 1;
        const held = portfolio.shares[id] ?? 0;
        return (
          <li key={id}>
            <Card className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">{t(r.company.nameKey)}</h3>
                  <Badge>{r.company.ticker}</Badge>
                  {r.failed && <Badge tone="bad">{t('stockmarket.shut')}</Badge>}
                </div>
                <p className="text-sm text-ink-soft">
                  {t(r.company.taglineKey)} <span className="text-muted">· {t(`stockmarket.sector.${r.company.sector}`)}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Sparkline values={r.history} label={t('stockmarket.chart', { name: t(r.company.nameKey) })} />
                <div>
                  <div className="text-xl font-bold text-ink">{fmtPrice(r.now)}</div>
                  <div className={`text-sm font-bold ${r.change < 0 ? 'text-bad' : r.change > 0 ? 'text-brand' : 'text-muted'}`}>
                    <span aria-hidden="true">{r.change < 0 ? '▼ ' : r.change > 0 ? '▲ ' : ''}</span>
                    {signedPct(r.change)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-ink-soft">
                  {t('stockmarket.col.held')}: <span className="font-bold text-ink">{held}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`qty-${id}`}>
                    {t('stockmarket.qty')}
                  </label>
                  <select
                    id={`qty-${id}`}
                    value={q}
                    onChange={(e) => setQty((s) => ({ ...s, [id]: Number(e.target.value) }))}
                    className="min-h-11 rounded-lg border border-line-strong bg-surface-2 px-2 text-ink"
                  >
                    {QTYS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <Button onClick={() => onBuy(id, q)}>{t('stockmarket.buy')}</Button>
                  <Button variant="secondary" disabled={held === 0} onClick={() => onSell(id, Math.min(q, held))}>
                    {t('stockmarket.sell')}
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

/** A tiny line of the prices so far. Decorative: the numbers beside it carry the meaning. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 96;
  const h = 32;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (i: number) => (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w);
  const y = (v: number) => (hi === lo ? h / 2 : h - 3 - ((v - lo) / (hi - lo)) * (h - 6));
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={label} className="shrink-0 text-brand">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
