/** Step 2: pick one of four made-up funds. Each card shows a name, one line and the cost; the rest is one tap away. Never ranks them. */
import { assumptions, formatRupees, formatValue } from '@/core/market';
import { t } from '@/platform';
import { Badge } from '@/ui';

/** A typical year for a fund per ₹10,000, after its yearly cost: growth minus cost, plus or minus one swing. */
function fundYear(id: string) {
  const f = assumptions.funds[id]!;
  const net = f.meanAnnual - f.costYearly;
  return { low: 10000 * (1 + net - f.volAnnual), high: 10000 * (1 + net + f.volAnnual) };
}

export function PickStep({ fundId, onPick }: { fundId: string | null; onPick: (id: string) => void }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2" role="radiogroup" aria-label={t('mutualfund.step.pick')}>
      {Object.entries(assumptions.funds).map(([id, f]) => {
        const chosen = fundId === id;
        const year = fundYear(id);
        return (
          <li key={id} className={`rounded-xl border transition-colors ${chosen ? 'border-brand bg-brand/10' : 'border-line bg-surface'}`}>
            <button
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => onPick(id)}
              className="w-full rounded-xl p-5 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-ink">{t(f.labelKey)}</h3>
                <Badge variant={chosen ? 'good' : 'neutral'}>{chosen ? t('mutualfund.pick.chosen') : t(`mutualfund.style.${f.style}`)}</Badge>
              </div>
              <p className="mt-2 text-ink-soft">{t(`mutualfund.fund.${id}.what`)}</p>
              <p className="mt-2 text-sm font-bold text-ink">{t('mutualfund.pick.cost', { cost: formatValue(f.costYearly, 'percent', 1) })}</p>
            </button>
            <details className="px-5 pb-4 text-sm">
              <summary className="cursor-pointer font-bold text-info">{t('mutualfund.pick.more')}</summary>
              <div className="mt-2 space-y-1 text-ink-soft">
                <p>{t(`mutualfund.fund.${id}.holds`)}</p>
                <p>{t('mutualfund.pick.year', { low: formatRupees(year.low), high: formatRupees(year.high) })}</p>
                {f.tradingCost !== undefined && <p>{t('mutualfund.pick.etf', { tc: formatValue(f.tradingCost, 'percent', 1) })}</p>}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
