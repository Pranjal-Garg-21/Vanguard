/** Step 3: lump sum or monthly SIP, how much, and how many years. */
import { assumptions, formatRupees, months, type FundPlan } from '@/core/market';
import { LabSlider } from '@/games/investing/lessons/widgets/controls';
import { t } from '@/platform';
import { Card } from '@/ui';
import raw from '@/content/scenarios/invest/mutual_fund.json';

const LIMITS = (raw as { plan: Record<'lump' | 'sip', { min: number; max: number; step: number; default: number }> & { years: { min: number; max: number; default: number } } }).plan;

export const defaultPlan = (method: FundPlan['method']): FundPlan => ({ method, amount: LIMITS[method].default, years: LIMITS.years.default });

export function PlanStep({ fundId, plan, onChange }: { fundId: string; plan: FundPlan; onChange: (p: FundPlan) => void }) {
  const lim = LIMITS[plan.method];
  const total = plan.method === 'sip' ? plan.amount * months(plan) : plan.amount;

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <h2 className="font-bold">{t('mutualfund.plan.method')}</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('mutualfund.plan.method')}>
          {(['lump', 'sip'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={plan.method === m}
              onClick={() => plan.method !== m && onChange(defaultPlan(m))}
              className={`min-h-11 rounded-lg border px-4 text-start font-bold transition-colors ${
                plan.method === m ? 'border-brand bg-brand/15 text-brand' : 'border-line-strong text-ink-soft hover:border-brand'
              }`}
            >
              {t(`mutualfund.plan.${m}`)}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LabSlider id="mf-amount" label={t(`mutualfund.plan.amount.${plan.method}`)} shown={formatRupees(plan.amount)} min={lim.min} max={lim.max} step={lim.step} value={plan.amount} onChange={(amount) => onChange({ ...plan, amount })} />
          <LabSlider id="mf-years" label={t('mutualfund.plan.years')} shown={String(plan.years)} min={LIMITS.years.min} max={LIMITS.years.max} step={1} value={plan.years} onChange={(years) => onChange({ ...plan, years })} />
        </div>
        <p className="text-ink-soft">{t('mutualfund.plan.summary', { total: formatRupees(total), fund: t(assumptions.funds[fundId]!.labelKey) })}</p>
      </Card>
    </div>
  );
}
