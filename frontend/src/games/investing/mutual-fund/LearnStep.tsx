/** Step 1: how a fund works. A picture of the pool, and a small calculator for NAV and units. */
import { useState } from 'react';
import { formatRupees } from '@/core/market';
import { LabSlider, Readout } from '@/games/investing/lessons/widgets/controls';
import { t } from '@/platform';
import { Button, Card } from '@/ui';

const fmt = (n: number) => String(Number(n.toFixed(2)));

export function LearnStep({ nav, onNext }: { nav: { pool: number; units: number; money: number }; onNext: () => void }) {
  const [pool, setPool] = useState(nav.pool);
  const [units, setUnits] = useState(nav.units);
  const [money, setMoney] = useState(nav.money);
  const price = pool / units;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-bold">{t('mutualfund.learn.pool.title')}</h2>
        <p className="max-w-3xl text-ink-soft">{t('mutualfund.learn.pool.body')}</p>
        <PoolPicture />
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">{t('mutualfund.learn.nav.title')}</h2>
        <p className="max-w-3xl text-ink-soft">{t('mutualfund.learn.nav.body')}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <LabSlider id="nav-pool" label={t('mutualfund.learn.calc.value')} shown={formatRupees(pool)} min={200000} max={1000000} step={50000} value={pool} onChange={setPool} />
          <LabSlider id="nav-units" label={t('mutualfund.learn.calc.units')} shown={units.toLocaleString('en-IN')} min={2000} max={10000} step={500} value={units} onChange={setUnits} />
          <LabSlider id="nav-money" label={t('mutualfund.learn.calc.money')} shown={formatRupees(money)} min={1000} max={10000} step={500} value={money} onChange={setMoney} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
          <Readout label={t('mutualfund.learn.calc.nav')} value={formatRupees(price, 2)} />
          <Readout label={t('mutualfund.learn.calc.yours')} value={fmt(money / price)} tone="good" />
        </div>
      </Card>

      <Button size="lg" onClick={onNext}>
        {t('mutualfund.learn.next')}
      </Button>
    </div>
  );
}

/** Many small coins flow into one fund, which holds pieces of many companies. */
function PoolPicture() {
  return (
    <svg viewBox="0 0 640 150" className="w-full max-w-2xl text-ink-soft" role="img" aria-label={`${t('mutualfund.learn.people')} → ${t('mutualfund.learn.fund')} → ${t('mutualfund.learn.companies')}`}>
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={i} cx={30 + (i % 4) * 34} cy={36 + Math.floor(i / 4) * 40} r={12} fill="var(--color-brand)" fillOpacity={0.8} />
      ))}
      <text x={86} y={138} textAnchor="middle" fontSize={13} fill="currentColor">
        {t('mutualfund.learn.people')}
      </text>
      <path d="M170 76 H250" stroke="currentColor" strokeWidth={2} markerEnd="url(#arrow)" />
      <rect x={260} y={36} width={120} height={80} rx={12} fill="var(--color-surface-3)" stroke="var(--color-brand)" strokeWidth={2} />
      <text x={320} y={82} textAnchor="middle" fontSize={15} fontWeight="bold" fill="var(--color-ink)">
        {t('mutualfund.learn.fund')}
      </text>
      <path d="M390 76 H470" stroke="currentColor" strokeWidth={2} markerEnd="url(#arrow)" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={485 + (i % 3) * 42} y={30 + Math.floor(i / 2 / 1.5) * 46} width={32} height={32} rx={6} fill="var(--color-info)" fillOpacity={0.75} />
      ))}
      <text x={548} y={138} textAnchor="middle" fontSize={13} fill="currentColor">
        {t('mutualfund.learn.companies')}
      </text>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
        </marker>
      </defs>
    </svg>
  );
}
