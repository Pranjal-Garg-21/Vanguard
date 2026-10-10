/**
 * Stock Market Simulator: twelve weekly rounds of news, prices and your own buy / sell / hold choices.
 * Use case UC-INV-07 · Owner: P4 · Route: /learn/invest/stock-market
 *
 * Split screen: "Your money" and a coach on one side, the market on the other. Every move updates your money
 * and the coach says what it did. Fictional companies, a seeded market, and nothing here is a recommendation.
 */
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { formatValue } from '@/core/market';
import { InvestShell } from '@/games/investing/lessons/InvestShell';
import { logEvent, t } from '@/platform';
import { AssumptionsDrawer, Button, Card, ChevronIcon, ProgressBar } from '@/ui';
import raw from '@/content/scenarios/invest/stock_market.json';
import { CoachDock, CoachFeed, type Turn } from './CoachFeed';
import { Debrief } from './Debrief';
import { pricesAt } from './logic/analysis';
import { commentsAfterTrade, commentsAfterWeek, type Comment } from './logic/coach';
import { money, signedMoney } from './logic/format';
import { buildMarket, changeAt, newsForRound, priceAt } from './logic/market';
import { buy, feeRate, isError, newPortfolio, payDividends, sell, totalValue } from './logic/portfolio';
import type { MarketConfig, Portfolio } from './logic/types';
import { MarketTable, type Row } from './MarketTable';
import { MoneyPanel } from './MoneyPanel';
import { NewsCard } from './NewsCard';

const config = raw as unknown as MarketConfig;
const MAX_TURNS = 8;

export function StockMarket({ seed = 'stock-market' }: { seed?: number | string }) {
  const market = useMemo(() => buildMarket(config, seed), [seed]);
  const [phase, setPhase] = useState<'intro' | 'play' | 'debrief'>('intro');
  const [round, setRound] = useState(1);
  const [portfolio, setPortfolio] = useState<Portfolio>(() => newPortfolio(config.cash));
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const turnId = useRef(0);

  const prices = pricesAt(config, market, round);
  const news = newsForRound(config, round);
  const failedIds = new Set(config.news.filter((n) => n.fail && n.round <= round).map((n) => n.fail!));
  const changes = Object.fromEntries(config.companies.map((c) => [c.id, changeAt(market, c.id, round)]));
  const rows: Row[] = config.companies.map((company) => ({
    company,
    history: market.prices[company.id]!.slice(0, round),
    now: priceAt(market, company.id, round),
    change: changes[company.id] ?? 0,
    failed: failedIds.has(company.id),
  }));
  const total = totalValue(portfolio, prices);
  const gain = total - config.cash;
  const nameOf = (id: string) => t(config.companies.find((c) => c.id === id)!.nameKey);
  const feeText = formatValue(feeRate(), 'percent', 1);

  const addTurn = (turnRound: number, comments: Comment[]) => {
    if (comments.length === 0) return;
    setTurns((prev) => [{ id: ++turnId.current, round: turnRound, comments }, ...prev].slice(0, MAX_TURNS));
  };

  const log = (choice: string, extra: { misconception?: string; concept?: string } = {}) =>
    void logEvent({
      mode: 'arcade',
      activity: 'stock_market',
      concept: extra.concept ?? 'stock_basics',
      choice,
      level: 2,
      ...(extra.misconception ? { misconception: extra.misconception } : {}),
    });

  const trade = (side: 'buy' | 'sell', id: string, qty: number) => {
    const p = prices[id] ?? 0;
    const next = side === 'buy' ? buy(portfolio, round, id, qty, p) : sell(portfolio, round, id, qty, p);
    if (isError(next)) {
      setError(t(`stockmarket.err.${next}`));
      return;
    }
    setError(null);
    const last = next.trades[next.trades.length - 1]!;
    setPortfolio(next);
    addTurn(
      round,
      commentsAfterTrade({ config, round, side, id, qty, price: last.price, fee: last.fee, before: portfolio, after: next, prices, changes, news, failedIds, name: nameOf }),
    );
    const onRumour = side === 'buy' && round === config.rumour.round && id === config.rumour.company;
    const inDrop = side === 'sell' && round === config.drop.round;
    log(`${side}_${id}_w${round}`, {
      ...(onRumour ? { misconception: 'chasing_hype', concept: 'behaviour_gap' } : {}),
      ...(inDrop ? { misconception: 'panic_selling', concept: 'behaviour_gap' } : {}),
    });
  };

  const endWeek = () => {
    setError(null);
    if (round >= config.rounds) {
      log(`end_${Math.round((gain / config.cash) * 100)}`, { concept: 'profit_loss' });
      setPhase('debrief');
      window.scrollTo({ top: 0 });
      return;
    }
    const next = round + 1;
    const paid = payDividends(portfolio, config, next);
    addTurn(
      next,
      commentsAfterWeek({
        config,
        round: next,
        portfolio,
        prevPrices: prices,
        prices: pricesAt(config, market, next),
        dividendsPaid: paid.dividends - portfolio.dividends,
        news: newsForRound(config, next),
        name: nameOf,
      }),
    );
    setPortfolio(paid);
    setRound(next);
  };

  const replay = () => {
    setPortfolio(newPortfolio(config.cash));
    setRound(1);
    setError(null);
    setTurns([]);
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
            <li>{t('stockmarket.intro.2', { fee: feeText })}</li>
            <li>{t('stockmarket.intro.3')}</li>
            <li>{t('stockmarket.intro.5')}</li>
            <li>{t('stockmarket.intro.4')}</li>
          </ul>
          <Button size="lg" onClick={() => setPhase('play')}>
            {t('stockmarket.intro.start')}
          </Button>
        </Card>
      )}

      {phase === 'play' && news && (
        <div className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:pb-0">
          {/* Left on a laptop: your money, and what your last move did to it */}
          <aside className="order-2 space-y-4 lg:order-1 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pe-1">
            <MoneyPanel
              config={config}
              portfolio={portfolio}
              prices={prices}
              between={
                <div className="hidden lg:block">
                  <CoachFeed turns={turns} />
                </div>
              }
            />
            <AssumptionsDrawer assetIds={[]} showInflation={false} notes={[t('stockmarket.assume.fee', { fee: feeText }), t('stockmarket.assume.prices')]} />
          </aside>

          {/* Right: the market */}
          <div className="order-1 space-y-4 lg:order-2">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h1 className="text-2xl font-bold">{t('stockmarket.round', { n: round, total: config.rounds })}</h1>
                <span className="text-sm text-muted">{t('stockmarket.title')}</span>
              </div>
              <ProgressBar value={(round - 1) / config.rounds} />
            </div>

            {/* On a phone the money panel sits lower down, so keep the numbers that matter in view. */}
            <div className="sticky top-14 z-[5] grid grid-cols-3 gap-2 bg-bg py-2 lg:hidden">
              <MiniStat label={t('stockmarket.stat.total')} value={money(total)} />
              <MiniStat label={t('stockmarket.stat.gain')} value={signedMoney(gain)} tone={gain < 0 ? 'bad' : gain > 0 ? 'good' : 'plain'} />
              <MiniStat label={t('stockmarket.stat.cash')} value={money(portfolio.cash)} />
            </div>

            <NewsCard news={news} vars={{ cash: money(config.cash) }} />

            {error && (
              <p role="alert" className="rounded-lg border-l-4 border-warn bg-warn/10 p-3 text-ink">
                {error}
              </p>
            )}

            <MarketTable rows={rows} portfolio={portfolio} onBuy={(id, q) => trade('buy', id, q)} onSell={(id, q) => trade('sell', id, q)} />

            <Button size="lg" className="w-full" onClick={endWeek}>
              {round >= config.rounds ? t('stockmarket.end.last') : t('stockmarket.end.week', { n: round })}
            </Button>
          </div>
        </div>
      )}

      {phase === 'play' && <CoachDock turn={turns[0]} />}

      {phase === 'debrief' && <Debrief config={config} market={market} portfolio={portfolio} seed={seed} onReplay={replay} />}
    </InvestShell>
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
