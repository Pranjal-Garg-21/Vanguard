/**
 * "Your money": the total, where it sits (a bar), and your cash. What you hold, fees and dividends are folded away
 * until you ask, so the screen shows only what you need to decide.
 */
import type { ReactNode } from 'react';
import { formatValue } from '@/core/market';
import { t } from '@/platform';
import { Card } from '@/ui';
import { money, price as fmtPrice, signedMoney } from './logic/format';
import { positionOf, totalValue } from './logic/portfolio';
import type { MarketConfig, Portfolio } from './logic/types';

/** One colour per company; the legend always spells out the name and share, so colour is never the only signal. */
const SWATCH = ['bg-brand', 'bg-info', 'bg-warn', 'bg-xp', 'bg-bad', 'bg-ink-soft'];

/** Briefly highlights a value when it changes, so the effect of a move is hard to miss. */
function Flash({ value, className = '' }: { value: string; className?: string }) {
  return (
    <span key={value} className={`flash-change rounded px-1 ${className}`}>
      {value}
    </span>
  );
}

export function MoneyPanel({
  config,
  portfolio,
  prices,
  between,
}: {
  config: MarketConfig;
  portfolio: Portfolio;
  prices: Record<string, number>;
  /** Shown right under the headline numbers, so the coach sits next to them. */
  between?: ReactNode;
}) {
  const total = totalValue(portfolio, prices);
  const gain = total - config.cash;
  const held = config.companies
    .map((c, i) => ({ company: c, swatch: SWATCH[i % SWATCH.length]!, pos: positionOf(portfolio, c.id, prices[c.id] ?? 0) }))
    .filter((h) => h.pos.shares > 0);
  const segments = [
    { id: 'cash', label: t('stockmarket.money.cash'), value: portfolio.cash, swatch: 'bg-surface-3' },
    ...held.map((h) => ({ id: h.company.id, label: t(h.company.nameKey), value: h.pos.value, swatch: h.swatch })),
  ].filter((s) => s.value > 0);
  const share = (v: number) => (total > 0 ? v / total : 0);
  const gainTone = gain < 0 ? 'text-bad' : gain > 0 ? 'text-brand' : 'text-ink';

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('stockmarket.money.title')}</h2>
        <div>
          <div className="text-3xl font-bold text-ink">
            <Flash value={money(total)} />
          </div>
          <div className={`text-sm font-bold ${gainTone}`}>
            <span aria-hidden="true">{gain < 0 ? '▼ ' : gain > 0 ? '▲ ' : ''}</span>
            <Flash value={signedMoney(gain)} /> <span className="font-normal text-ink-soft">{t('stockmarket.money.started')}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div
            className="flex h-4 w-full overflow-hidden rounded-full bg-surface-3"
            role="img"
            aria-label={segments.map((s) => `${s.label} ${formatValue(share(s.value), 'percent')}`).join(', ')}
          >
            {segments.map((s) => (
              <div key={s.id} className={`${s.swatch} h-full transition-[width] duration-500`} style={{ width: `${share(s.value) * 100}%` }} />
            ))}
          </div>
          <ul className="space-y-1 text-sm">
            {segments.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className={`h-3 w-3 shrink-0 rounded-sm ${s.swatch}`} aria-hidden="true" />
                <span className="truncate text-ink-soft">{s.label}</span>
                <span className="ms-auto font-bold text-ink">{s.id === 'cash' ? <Flash value={money(s.value)} /> : formatValue(share(s.value), 'percent')}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {between}

      <details className="rounded-xl border border-line bg-surface">
        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
          <span className="font-bold text-ink">{t('stockmarket.money.holdings')}</span>
          <span className="text-sm text-muted">{held.length}</span>
        </summary>
        <div className="space-y-3 border-t border-line p-4">
          {held.length === 0 ? (
            <p className="text-sm text-ink-soft">{t('stockmarket.money.none')}</p>
          ) : (
            <ul className="space-y-2">
              {held.map(({ company, pos }) => (
                <li key={company.id} className="flex items-start justify-between gap-3 rounded-lg bg-surface-2 p-3">
                  <div>
                    <div className="font-bold text-ink">{t(company.nameKey)}</div>
                    <div className="text-xs text-ink-soft">{t(pos.shares === 1 ? 'stockmarket.money.row.one' : 'stockmarket.money.row', { shares: pos.shares, price: fmtPrice(prices[company.id] ?? 0) })}</div>
                  </div>
                  <div className="text-end">
                    <div className="font-bold text-ink">
                      <Flash value={money(pos.value)} />
                    </div>
                    <Paper value={pos.paper} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted">{t('stockmarket.money.paperNote')}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-surface-2 p-2">
              <dt className="text-xs text-ink-soft">{t('stockmarket.stat.fees')}</dt>
              <dd className="font-bold text-ink">
                <Flash value={money(portfolio.fees)} />
              </dd>
            </div>
            <div className="rounded-lg bg-surface-2 p-2">
              <dt className="text-xs text-ink-soft">{t('stockmarket.stat.dividends')}</dt>
              <dd className="font-bold text-ink">
                <Flash value={money(portfolio.dividends)} />
              </dd>
            </div>
          </dl>
        </div>
      </details>
    </div>
  );
}

function Paper({ value }: { value: number }) {
  const tone = value < 0 ? 'text-bad' : value > 0 ? 'text-brand' : 'text-muted';
  return (
    <div className={`text-sm font-bold ${tone}`}>
      <span aria-hidden="true">{value < 0 ? '▼ ' : value > 0 ? '▲ ' : ''}</span>
      {signedMoney(value)}
    </div>
  );
}
