/**
 * Stock Market Simulator: twelve weekly rounds of news, prices and your own buy / sell / hold choices.
 * Use case UC-INV-07 · Owner: P4 · Route: /learn/invest/stock-market
 *
 * Fictional companies, a seeded market (a class sharing a code sees the same weeks) and a debrief that
 * compares your result with the same market played quietly. Nothing here is a recommendation.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { formatValue } from '@/core/market';
import { InvestShell } from '@/games/investing/lessons/InvestShell';
import { logEvent, t } from '@/platform';
import { AssumptionsDrawer, Button, Card, ChevronIcon, ProgressBar } from '@/ui';
import raw from '@/content/scenarios/invest/stock_market.json';
import { Debrief } from './Debrief';
import { money, price as fmtPrice, signedMoney } from './format';
import { pricesAt } from './logic/analysis';
import { buildMarket, changeAt, newsForRound, priceAt } from './logic/market';
import { buy, feeRate, holdingsValue, isError, newPortfolio, payDividends, sell, totalValue } from './logic/portfolio';
import type { MarketConfig, Portfolio } from './logic/types';
import { MarketTable, type Row } from './MarketTable';
import { NewsCard } from './NewsCard';

const config = raw as unknown as MarketConfig;

export function StockMarket({ seed = 'stock-market' }: { seed?: number | string }) {
  const market = useMemo(() => buildMarket(config, seed), [seed]);
  const [phase, setPhase] = useState<'intro' | 'play' | 'debrief'>('intro');
  const [round, setRound] = useState(1);
  const [portfolio, setPortfolio] = useState<Portfolio>(() => newPortfolio(config.cash));
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  const prices = pricesAt(config, market, round);
  const news = newsForRound(config, round);
  const failedIds = new Set(config.news.filter((n) => n.fail && n.round <= round).map((n) => n.fail!));
  const rows: Row[] = config.companies.map((company) => ({
    company,
    history: market.prices[company.id]!.slice(0, round),
    now: priceAt(market, company.id, round),
    change: changeAt(market, company.id, round),
    failed: failedIds.has(company.id),
  }));
  const total = totalValue(portfolio, prices);
  const gain = total - config.cash;
  const nameOf = (id: string) => t(config.companies.find((c) => c.id === id)!.nameKey);

  const log = (choice: string, extra: { correct?: boolean; misconception?: string; concept?: string } = {}) =>
    void logEvent({
      mode: 'arcade',
      activity: 'stock_market',
      concept: extra.concept ?? 'stock_basics',
      choice,
      level: 2,
      ...(extra.correct !== undefined ? { correct: extra.correct } : {}),
      ...(extra.misconception ? { misconception: extra.misconception } : {}),
    });

  const trade = (side: 'buy' | 'sell', id: string, qty: number) => {
    const p = prices[id] ?? 0;
    const next = side === 'buy' ? buy(portfolio, round, id, qty, p) : sell(portfolio, round, id, qty, p);
    if (isError(next)) {
      setMessage({ tone: 'warn', text: t(`stockmarket.err.${next}`) });
      return;
    }
    const last = next.trades[next.trades.length - 1]!;
    const gross = last.qty * last.price;
    const fee = last.fee;
    setPortfolio(next);
    setMessage({
      tone: 'ok',
      text: t(`stockmarket.done.${side}`, { qty, name: nameOf(id), total: fmtPrice(side === 'buy' ? gross + fee : gross - fee), fee: fmtPrice(fee) }),
    });
    const onRumour = side === 'buy' && round === config.rumour.round && id === config.rumour.company;
    const inDrop = side === 'sell' && round === config.drop.round;
    log(`${side}_${id}_w${round}`, {
      ...(onRumour ? { misconception: 'chasing_hype', concept: 'behaviour_gap' } : {}),
      ...(inDrop ? { misconception: 'panic_selling', concept: 'behaviour_gap' } : {}),
    });
  };

  const endWeek = () => {
    setMessage(null);
    if (round >= config.rounds) {
      const final = summariseLog(portfolio, prices);
      log(`end_${final}`, { concept: 'profit_loss' });
      setPhase('debrief');
      window.scrollTo({ top: 0 });
      return;
    }
    const next = round + 1;
    const paid = payDividends(portfolio, config, next);
    setPortfolio(paid);
    if (paid.dividends > portfolio.dividends) {
      setMessage({ tone: 'ok', text: t('stockmarket.dividend.paid', { amount: money(paid.dividends - portfolio.dividends) }) });
    }
    setRound(next);
  };

  const replay = () => {
    setPortfolio(newPortfolio(config.cash));
    setRound(1);
    setMessage(null);
    setPhase('intro');
    window.scrollTo({ top: 0 });
  };

  return (
    <InvestShell wide>
      <Link to="/learn/invest" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-brand">
        <ChevronIcon dir="left" />
        {t('stockmarket.back')}
      </Link>

      {phase === 'intro' && (
        <Card className="space-y-4">
          <h1 className="text-2xl font-bold">{t('stockmarket.title')}</h1>
          <p className="max-w-3xl text-ink-soft">{t('stockmarket.subtitle')}</p>
          <h2 className="font-bold">{t('stockmarket.intro.title')}</h2>
          <ul className="list-disc space-y-1 ps-5 text-ink">
            <li>{t('stockmarket.intro.1')}</li>
            <li>{t('stockmarket.intro.2', { fee: formatValue(feeRate(), 'percent', 1) })}</li>
            <li>{t('stockmarket.intro.3')}</li>
            <li>{t('stockmarket.intro.4')}</li>
          </ul>
          <Button size="lg" onClick={() => setPhase('play')}>
            {t('stockmarket.intro.start')}
          </Button>
        </Card>
      )}

      {phase === 'play' && news && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h1 className="text-2xl font-bold">{t('stockmarket.round', { n: round, total: config.rounds })}</h1>
                <span className="text-sm text-muted">{t('stockmarket.title')}</span>
              </div>
              <ProgressBar value={(round - 1) / config.rounds} />
            </div>

            {/* On a phone the full panel sits at the bottom, so keep the numbers that matter in view. */}
            <div className="sticky top-14 z-[5] grid grid-cols-3 gap-2 bg-bg py-2 lg:hidden" aria-label={t('stockmarket.stat.total')}>
              <MiniStat label={t('stockmarket.stat.total')} value={money(total)} />
              <MiniStat label={t('stockmarket.stat.gain')} value={signedMoney(gain)} tone={gain < 0 ? 'bad' : gain > 0 ? 'good' : 'plain'} />
              <MiniStat label={t('stockmarket.stat.cash')} value={money(portfolio.cash)} />
            </div>

            <NewsCard news={news} vars={{ cash: money(config.cash) }} />

            {message && (
              <p
                role="status"
                className={`rounded-lg border-l-4 p-3 text-ink ${message.tone === 'ok' ? 'border-brand bg-brand/10' : 'border-warn bg-warn/10'}`}
              >
                {message.text}
              </p>
            )}

            <MarketTable rows={rows} portfolio={portfolio} onBuy={(id, q) => trade('buy', id, q)} onSell={(id, q) => trade('sell', id, q)} />

            <Button size="lg" className="w-full" onClick={endWeek}>
              {round >= config.rounds ? t('stockmarket.end.last') : t('stockmarket.end.week', { n: round })}
            </Button>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-20">
            <Card className="space-y-3">
              <Stat label={t('stockmarket.stat.total')} value={money(total)} big />
              <Stat label={t('stockmarket.stat.gain')} value={signedMoney(gain)} tone={gain < 0 ? 'bad' : gain > 0 ? 'good' : 'plain'} />
              <Stat label={t('stockmarket.stat.cash')} value={money(portfolio.cash)} />
              <Stat label={t('stockmarket.stat.shares')} value={money(holdingsValue(portfolio, prices))} />
              <Stat label={t('stockmarket.stat.fees')} value={money(portfolio.fees)} />
              <Stat label={t('stockmarket.stat.dividends')} value={money(portfolio.dividends)} />
            </Card>
            <AssumptionsDrawer
              assetIds={[]}
              showInflation={false}
              notes={[t('stockmarket.assume.fee', { fee: formatValue(feeRate(), 'percent', 1) }), t('stockmarket.assume.prices')]}
            />
          </aside>
        </div>
      )}

      {phase === 'debrief' && <Debrief config={config} market={market} portfolio={portfolio} seed={seed} onReplay={replay} />}
    </InvestShell>
  );
}

/** Whole-percent gain for the "game ended" event, as a telemetry-safe string such as 4 or -7. */
function summariseLog(p: Portfolio, prices: Record<string, number>): string {
  return String(Math.round(((totalValue(p, prices) - config.cash) / config.cash) * 100));
}

function Stat({ label, value, tone = 'plain', big = false }: { label: string; value: string; tone?: 'plain' | 'good' | 'bad'; big?: boolean }) {
  const colour = tone === 'good' ? 'text-brand' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className={`${big ? 'text-2xl' : 'text-lg'} font-bold ${colour}`}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'plain' | 'good' | 'bad' }) {
  const colour = tone === 'good' ? 'text-brand' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <div className="rounded-lg bg-surface-2 p-2 text-center">
      <div className="text-xs text-ink-soft">{label}</div>
      <div className={`text-lg font-bold ${colour}`}>{value}</div>
    </div>
  );
}
