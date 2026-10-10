/** Step 2: pick one of four made-up funds. Shows what each holds, what it costs and a typical year. Never ranks them. */
import { assumptions, formatRupees, formatValue } from '@/core/market';
import { t } from '@/platform';
import { Badge, Button } from '@/ui';

/** A typical year for a fund per ₹10,000, after its yearly cost: growth minus cost, plus or minus one swing. */
function fundYear(id: string) {
  const f = assumptions.funds[id]!;
  const net = f.meanAnnual - f.costYearly;
  return { low: 10000 * (1 + net - f.volAnnual), high: 10000 * (1 + net + f.volAnnual) };
}

export function PickStep({ fundId, onPick, onNext, onBack }: { fundId: string | null; onPick: (id: string) => void; onNext: () => void; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-ink-soft">{t('mutualfund.pick.intro')}</p>
      <ul className="grid gap-4 md:grid-cols-2" role="radiogroup" aria-label={t('mutualfund.step.pick')}>
        {Object.entries(assumptions.funds).map(([id, f]) => {
          const chosen = fundId === id;
          const year = fundYear(id);
          return (
            <li key={id}>
              <button
                type="button"
                role="radio"
                aria-checked={chosen}
                onClick={() => onPick(id)}
                className={`h-full w-full rounded-xl border p-5 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  chosen ? 'border-brand bg-brand/10' : 'border-line bg-surface hover:border-brand'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-ink">{t(f.labelKey)}</h3>
                  <Badge tone={chosen ? 'good' : 'neutral'}>{chosen ? t('mutualfund.pick.chosen') : t(`mutualfund.style.${f.style}`)}</Badge>
                </div>
                <p className="mt-2 text-ink-soft">{t(`mutualfund.fund.${id}.what`)}</p>
                <p className="mt-1 text-sm text-muted">{t(`mutualfund.fund.${id}.holds`)}</p>
                <dl className="mt-3 space-y-1 text-sm">
                  <dd className="font-bold text-ink">{t('mutualfund.pick.cost', { cost: formatValue(f.costYearly, 'percent', 1) })}</dd>
                  <dd className="text-ink-soft">{t('mutualfund.pick.year', { low: formatRupees(year.low), high: formatRupees(year.high) })}</dd>
                  {f.tradingCost !== undefined && <dd className="text-ink-soft">{t('mutualfund.pick.etf', { tc: formatValue(f.tradingCost, 'percent', 1) })}</dd>}
                </dl>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onBack}>
          {t('mutualfund.back.step')}
        </Button>
        <Button size="lg" disabled={!fundId} onClick={onNext}>
          {t('mutualfund.pick.next')}
        </Button>
      </div>
    </div>
  );
}

