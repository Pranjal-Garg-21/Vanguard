/** After week 12: what happened, why, how spread out you were, the same market played quietly, and a short check. */
import { useMemo } from 'react';
import { formatValue } from '@/core/market';
import { runCalcs } from '@/games/investing/lessons/logic/calc';
import { QuestionRow } from '@/games/investing/lessons/RoomQuestions';
import { useQuestionRunner } from '@/games/investing/lessons/useQuestionRunner';
import { t } from '@/platform';
import { AssumptionsDrawer, Button, Card, RangeDisplay } from '@/ui';
import { money, price, signedMoney, signedPct } from './logic/format';
import { behaviour, diversification, movesByCompany, pricesAt, spreadAndHold, summarise } from './logic/analysis';
import { nextWeeksRange } from './logic/market';
import { feeRate } from './logic/portfolio';
import type { Market, MarketConfig, Portfolio } from './logic/types';

export function Debrief({
  config,
  market,
  portfolio,
  seed,
  onReplay,
}: {
  config: MarketConfig;
  market: Market;
  portfolio: Portfolio;
  seed: number | string;
  onReplay: () => void;
}) {
  const last = useMemo(() => pricesAt(config, market, config.rounds), [config, market]);
  const result = summarise(config, portfolio, last);
  const moves = useMemo(() => movesByCompany(config, market), [config, market]);
  const spread = diversification(portfolio, last);
  const quiet = useMemo(() => summarise(config, spreadAndHold(config, market), last), [config, market, last]);
  const acts = behaviour(config, portfolio);
  const range = useMemo(
    () => nextWeeksRange(config, portfolio.shares, last, portfolio.cash, 12, seed),
    [config, portfolio, last, seed],
  );

  const name = (id: string) => t(config.companies.find((c) => c.id === id)!.nameKey);
  const rumourQty = portfolio.trades.filter((x) => x.side === 'buy' && x.round === config.rumour.round && x.id === config.rumour.company).reduce((s, x) => s + x.qty, 0);
  const failedId = config.news.find((n) => n.fail)?.fail;

  const checkCtx = useMemo(() => runCalcs(config.check.vars, config.check.calcs), [config]);
  const runner = useQuestionRunner('stock_market', checkCtx);
  const earned = config.check.questions.reduce((s, q) => s + runner.earnedFor(q), 0);
  const total = config.check.questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <h1 className="text-2xl font-bold">{t('stockmarket.debrief.title')}</h1>
        <p className="text-xl text-ink">
          {t('stockmarket.debrief.result', {
            value: money(result.value),
            gain: signedMoney(result.gain),
            pct: signedPct(result.gainPct),
            cash: money(config.cash),
          })}
        </p>
        <p className="text-ink-soft">
          {result.trades === 0
            ? t('stockmarket.debrief.noTrades')
            : t('stockmarket.debrief.trades', { n: result.trades, fees: money(result.fees) })}{' '}
          {result.dividends > 0 && t('stockmarket.debrief.dividends', { amount: money(result.dividends) })}
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">{t('stockmarket.moves.title')}</h2>
        <ul className="space-y-3">
          {moves.map((m) => (
            <li key={m.id} className="rounded-lg bg-surface-2 p-3">
              <p className="font-bold text-ink">
                {t('stockmarket.moves.row', { name: name(m.id), start: price(m.start), end: price(m.end), pct: signedPct(m.changePct) })}
              </p>
              {m.failed && <p className="text-sm text-bad">{t('stockmarket.moves.failed')}</p>}
              {m.newsKeys.length === 0 ? (
                <p className="text-sm text-ink-soft">{t('stockmarket.moves.nothing')}</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm text-ink-soft">
                  {m.newsKeys.map((k) => (
                    <li key={k}>{t('stockmarket.moves.biggest', { news: t(k, { cash: money(config.cash) }) })}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">{t('stockmarket.spread.title')}</h2>
        <p className="text-ink">{t(`stockmarket.spread.${spread.label}`, { count: spread.count, top: formatValue(spread.topShare, 'percent') })}</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">{t('stockmarket.moments.title')}</h2>
        <ul className="space-y-2 text-ink">
          <li>
            {acts.boughtOnRumour
              ? t('stockmarket.moments.rumour.yes', { round: config.rumour.round, name: name(config.rumour.company), qty: rumourQty })
              : t('stockmarket.moments.rumour.no', { round: config.rumour.round, name: name(config.rumour.company) })}
          </li>
          <li>{t(`stockmarket.moments.drop.${acts.soldInDrop ? 'yes' : 'no'}`, { round: config.drop.round })}</li>
          {failedId && <li>{t(`stockmarket.moments.fail.${acts.heldFailed ? 'yes' : 'no'}`, { name: name(failedId) })}</li>}
        </ul>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">{t('stockmarket.compare.title')}</h2>
        <p className="text-ink">
          {t('stockmarket.compare.body', { cash: money(config.cash), value: money(quiet.value), gain: signedMoney(quiet.gain), yours: money(result.value) })}
        </p>
        <p className="text-sm text-muted">{t('stockmarket.compare.note')}</p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">{t('stockmarket.next.title')}</h2>
        <RangeDisplay low={range.low} median={range.median} high={range.high} />
        <p className="text-sm text-muted">{t('stockmarket.next.note')}</p>
        <AssumptionsDrawer
          assetIds={[]}
          showInflation={false}
          notes={[t('stockmarket.assume.fee', { fee: formatValue(feeRate(), 'percent', 1) }), t('stockmarket.assume.prices')]}
        />
      </Card>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{t('stockmarket.check.title')}</h2>
          <span className="text-sm font-bold text-muted">{t('investui.room.pointsEarned', { earned, total })}</span>
        </div>
        {config.check.questions.map((q) => (
          <QuestionRow
            key={q.id}
            q={q}
            ctx={checkCtx}
            state={runner.stateOf(q)}
            onSubmitNumber={(v) => runner.submitNumber(q, v)}
            onPickOption={(id) => runner.pickOption(q, id)}
            onHint={() => runner.toggleHint(q)}
            onReveal={() => runner.reveal(q)}
          />
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={onReplay}>
          {t('stockmarket.replay')}
        </Button>
      </div>
    </div>
  );
}
