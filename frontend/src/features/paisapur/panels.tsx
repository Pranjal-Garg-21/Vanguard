/**
 * Full panels opened by the story: shops, bank, loans, bonds, the exchange,
 * the news board, the month summary, the Start menu and the year review.
 * Every money change goes through `act`, which returns an error key or null.
 */
import { useState, type ReactNode } from 'react';
import {
  debtTotal,
  depositValue,
  emergencyFund,
  gstIn,
  holdingsValue,
  incomeFor,
  ITEMS,
  monthlyNeeds,
  monthsAtMinimum,
  monthSummary,
  needsCost,
  netWorth,
  priceOf,
  RULES,
  totalCost,
  type Action,
  type LifeState,
  type LoanKind,
  type PayFrom,
} from '@/core/engine';
import { ASSETS, change, headline, priceAt, type AssetId } from '@/core/market';
import { BADGES, CONCEPTS } from '@/core/story/content';
import { t } from '@/platform';
import { percent, rupees } from './logic/format';
import { KEY_A, KEY_B, useKeys } from './input';
import { bagContents, POCKETS, type BagItem, type Pocket } from './logic/bag';
import { Box } from './ui';

export type Act = (a: Action) => string | null;

function Window({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useKeys((k) => {
    if (KEY_B.has(k)) onClose();
  });
  return (
    <div className={`mx-auto flex max-h-full w-full flex-col ${wide ? 'max-w-3xl' : 'max-w-xl'}`} role="dialog" aria-modal="true" aria-label={title}>
      <Box className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b-2 border-[#8fb0d8] pb-2">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded bg-[#3a4a6b] px-3 py-1 text-sm font-bold text-white">
            {t('paisapur.close')}
          </button>
        </div>
        <div className="mt-2 max-h-[60dvh] overflow-y-auto pr-1">{children}</div>
      </Box>
    </div>
  );
}

function Btn({ children, onClick, disabled, tone = 'blue' }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: 'blue' | 'green' | 'red' | 'grey' }) {
  const tones = { blue: 'bg-[#3a4a6b]', green: 'bg-green-700', red: 'bg-red-700', grey: 'bg-slate-500' };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40 ${tones[tone]}`}>
      {children}
    </button>
  );
}

function Row({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-0.5 ${strong ? 'border-t border-slate-300 pt-1 font-bold' : ''}`}>
      <span>{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}

function useError() {
  const [error, setError] = useState<string | null>(null);
  const run = (act: Act, a: Action) => setError(act(a));
  const view = error ? (
    <p className="mt-2 rounded bg-red-100 p-2 text-sm text-red-900" role="alert">
      {t(error)}
    </p>
  ) : null;
  return { run, view };
}

function SimBanner() {
  return <p className="mb-2 rounded bg-amber-100 p-2 text-xs font-bold text-amber-900">{t('paisapur.sim_banner')}</p>;
}

// ── Shops ───────────────────────────────────────────────────────────────

export function ShopPanel({ shop, life, act, onClose }: { shop: 'zaroorat' | 'shauq'; life: LifeState; act: Act; onClose: () => void }) {
  const err = useError();
  const [from, setFrom] = useState<PayFrom>(life.bank.upi ? 'bank' : 'cash');
  const items = ITEMS.filter((i) => i.shop === shop && (!i.stage || i.stage === life.lifeStage));
  const needs = monthlyNeeds(life);
  const left = needs.filter((i) => !life.bought.includes(i.id));
  return (
    <Window title={t(`maps.${shop}`)} onClose={onClose}>
      {shop === 'zaroorat' && (
        <p className={`mb-2 rounded p-2 text-sm ${left.length ? 'bg-amber-100' : 'bg-green-100'}`}>
          {left.length
            ? t('paisapur.shop.list_left', { items: left.map((i) => t(`paisapur.item.${i.id}`)).join(', ') })
            : t('paisapur.shop.list_done')}
        </p>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span>{t('paisapur.shop.pay_with')}</span>
        <Btn tone={from === 'cash' ? 'green' : 'grey'} onClick={() => setFrom('cash')}>
          💵 {t('paisapur.shop.cash', { amount: rupees(life.cash) })}
        </Btn>
        <Btn tone={from === 'bank' ? 'green' : 'grey'} disabled={!life.bank.upi} onClick={() => setFrom('bank')}>
          📱 {t('paisapur.shop.upi', { amount: rupees(life.bank.balance) })}
        </Btn>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const price = priceOf(item, life.month);
          const bought = life.bought.includes(item.id);
          const onList = needs.some((n) => n.id === item.id);
          const goalShare = life.goal.target ? price / life.goal.target : 0;
          return (
            <li key={item.id} className="rounded border border-slate-300 bg-white p-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {t(`paisapur.item.${item.id}`)}{' '}
                    <span className={`ml-1 rounded px-1 text-xs ${item.kind === 'need' ? 'bg-green-200' : 'bg-pink-200'}`}>
                      {t(`paisapur.shop.${item.kind}`)}
                    </span>
                    {onList && <span className="ml-1 rounded bg-amber-200 px-1 text-xs">{t('paisapur.shop.on_list')}</span>}
                  </p>
                  <p className="text-sm">
                    {item.was && <span className="mr-1 text-red-700 line-through">{rupees(item.was)}</span>}
                    <span className="font-bold">{rupees(price)}</span>{' '}
                    <span className="text-xs text-slate-600">{t('paisapur.shop.gst', { rate: item.gst, amount: rupees(gstIn(price, item.gst)) })}</span>
                  </p>
                  {item.kind === 'want' && goalShare >= 0.02 && (
                    <p className="text-xs text-slate-700">{t('paisapur.shop.opportunity', { pct: Math.round(goalShare * 100), goal: t(`paisapur.goal.${life.goal.id}`) })}</p>
                  )}
                </div>
                <Btn tone={bought && onList ? 'grey' : 'blue'} disabled={bought && onList} onClick={() => err.run(act, { type: 'buy', item: item.id, from })}>
                  {bought && onList ? t('paisapur.shop.bought') : t('paisapur.shop.buy')}
                </Btn>
              </div>
            </li>
          );
        })}
      </ul>
      {err.view}
    </Window>
  );
}

// ── Bank ────────────────────────────────────────────────────────────────

function Amounts({ values, onPick, label }: { values: number[]; onPick: (n: number) => void; label: (n: number) => string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <Btn key={v} onClick={() => onPick(v)}>
          {label(v)}
        </Btn>
      ))}
    </div>
  );
}

export function BankPanel({ life, act, onClose }: { life: LifeState; act: Act; onClose: () => void }) {
  const err = useError();
  const [fdMonths, setFdMonths] = useState(6);
  const steps = [100, 500, 1000];
  return (
    <Window title={t('maps.bank')} onClose={onClose}>
      <Row label={t('paisapur.bank.cash')} value={rupees(life.cash)} />
      <Row label={t('paisapur.bank.balance')} value={rupees(life.bank.balance)} />
      <Row label={t('paisapur.bank.pot', { goal: t(`paisapur.goal.${life.goal.id}`) })} value={`${rupees(life.pot)} / ${rupees(life.goal.target)}`} />
      <p className="mt-1 text-xs text-slate-600">{t('paisapur.bank.interest_note', { rate: RULES.savingsRatePa * 100 })}</p>

      <h3 className="mt-3 font-bold">{t('paisapur.bank.deposit')}</h3>
      <Amounts values={steps} label={(n) => `+${rupees(n)}`} onPick={(n) => err.run(act, { type: 'deposit', amount: n })} />
      <h3 className="mt-2 font-bold">{t('paisapur.bank.withdraw')}</h3>
      <Amounts values={steps} label={(n) => `−${rupees(n)}`} onPick={(n) => err.run(act, { type: 'withdraw', amount: n })} />

      <h3 className="mt-3 font-bold">{t('paisapur.bank.autosave')}</h3>
      <p className="text-xs text-slate-600">{t('paisapur.bank.autosave_note')}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {[0, 100, 200, 300, 500].map((n) => (
          <Btn key={n} tone={life.bank.autoSave === n ? 'green' : 'grey'} onClick={() => err.run(act, { type: 'setAutoSave', amount: n })}>
            {n ? rupees(n) : t('paisapur.off')}
          </Btn>
        ))}
      </div>

      {life.chapter >= 3 && (
        <>
          <h3 className="mt-3 font-bold">{t('paisapur.bank.fd')}</h3>
          <p className="text-xs text-slate-600">{t('paisapur.bank.fd_note', { rate: RULES.depositRatePa * 100 })}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[3, 6, 12].map((m) => (
              <Btn key={m} tone={fdMonths === m ? 'green' : 'grey'} onClick={() => setFdMonths(m)}>
                {t('paisapur.months', { n: m })}
              </Btn>
            ))}
          </div>
          <div className="mt-1">
            <Amounts
              values={[500, 1000, 2000]}
              label={(n) => t('paisapur.bank.fd_open', { amount: rupees(n), value: rupees(n * (1 + RULES.depositRatePa / 12) ** fdMonths) })}
              onPick={(n) => err.run(act, { type: 'openDeposit', amount: n, months: fdMonths })}
            />
          </div>
          {life.deposits.map((d) => (
            <Row key={d.id} label={t('paisapur.bank.fd_row', { amount: rupees(d.amount), month: d.startMonth + d.months })} value={rupees(depositValue(d, life.month))} />
          ))}
        </>
      )}

      {life.loans.length > 0 && (
        <>
          <h3 className="mt-3 font-bold">{t('paisapur.bank.loans')}</h3>
          {life.loans.map((l) => (
            <div key={l.id} className="mt-1 rounded border border-slate-300 bg-white p-2 text-sm">
              <Row label={t(`paisapur.lender.${l.kind}`)} value={rupees(l.balance)} />
              <p className="text-xs text-slate-600">
                {l.kind === 'card'
                  ? t('paisapur.bank.card_note', { months: monthsAtMinimum(l.balance).months })
                  : t('paisapur.bank.loan_note', { emi: rupees(l.emi), months: l.monthsLeft, rate: (l.monthlyRate * 100).toFixed(1) })}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Btn onClick={() => err.run(act, { type: 'repayLoan', id: l.id, amount: Math.min(500, Math.ceil(l.balance)) })}>{t('paisapur.bank.repay', { amount: rupees(Math.min(500, l.balance)) })}</Btn>
                <Btn onClick={() => err.run(act, { type: 'repayLoan', id: l.id, amount: Math.ceil(l.balance) })}>{t('paisapur.bank.repay_all')}</Btn>
              </div>
            </div>
          ))}
          {life.creditScore !== null && <Row label={t('paisapur.bank.score')} value={life.creditScore} />}
        </>
      )}

      <h3 className="mt-3 font-bold">{t('paisapur.bank.statement')}</h3>
      <ul className="text-sm">
        {life.ledger
          .filter((e) => e.where !== 'cash')
          .slice(-8)
          .reverse()
          .map((e, i) => (
            <li key={i} className="flex justify-between border-b border-slate-200 py-0.5">
              <span>
                {t('paisapur.hud.month', { n: e.month })} · {t(`paisapur.reason.${e.reason.split(':')[0]}`)}
              </span>
              <span className={`tabular-nums ${e.amount < 0 ? 'text-red-700' : 'text-green-800'}`}>{rupees(e.amount)}</span>
            </li>
          ))}
      </ul>
      {err.view}
    </Window>
  );
}

// ── Loans ───────────────────────────────────────────────────────────────

export function LoanPanel({ kind, life, act, onClose }: { kind: Extract<LoanKind, 'bank' | 'moneylender' | 'education'>; life: LifeState; act: Act; onClose: () => void }) {
  const err = useError();
  const need = Math.max(1000, Math.round((life.goal.target - life.pot) / 1000) * 1000);
  const amounts = [...new Set([5000, 10000, need])].sort((a, b) => a - b);
  const [amountValue, setAmount] = useState(amounts[0]!);
  const tenures = kind === 'bank' ? [6, 12, 24] : kind === 'education' ? [12, 24, 36] : [3, 6, 12];
  const [months, setMonths] = useState(tenures[1]!);
  const [confirm, setConfirm] = useState(false);
  const rule = RULES.loan[kind];
  const cost = totalCost(kind, amountValue, months);
  const yearly = rule.monthlyRate * 12;
  const taken = life.loans.some((l) => l.kind === kind);

  return (
    <Window title={t(`paisapur.loan.title_${kind}`)} onClose={onClose}>
      <p className="text-sm">{t(`paisapur.loan.intro_${kind}`, { monthly: (rule.monthlyRate * 100).toFixed(0), yearly: Math.round(yearly * 100) })}</p>
      <h3 className="mt-2 font-bold">{t('paisapur.loan.amount')}</h3>
      <div className="flex flex-wrap gap-1.5">
        {amounts.map((a) => (
          <Btn key={a} tone={amountValue === a ? 'green' : 'grey'} onClick={() => setAmount(a)}>
            {rupees(a)}
          </Btn>
        ))}
      </div>
      <h3 className="mt-2 font-bold">{t('paisapur.loan.tenure')}</h3>
      <div className="flex flex-wrap gap-1.5">
        {tenures.map((m) => (
          <Btn key={m} tone={months === m ? 'green' : 'grey'} onClick={() => setMonths(m)}>
            {t('paisapur.months', { n: m })}
          </Btn>
        ))}
      </div>
      <div className="mt-3 rounded bg-white p-2">
        <Row label={t('paisapur.loan.emi')} value={rupees(cost.emi)} />
        <Row label={t('paisapur.loan.received')} value={rupees(cost.received)} />
        <Row label={t('paisapur.loan.total')} value={rupees(cost.total)} />
        <Row label={t('paisapur.loan.interest')} value={rupees(cost.interest)} strong />
        <p className="mt-1 text-xs text-slate-600">{t('paisapur.loan.doubling', { years: (72 / (yearly * 100)).toFixed(1) })}</p>
        <p className="mt-1 text-xs text-slate-600">{t('paisapur.loan.emi_vs_income', { pct: Math.round((cost.emi / Math.max(1, incomeFor(life, life.month + 1))) * 100) })}</p>
      </div>
      {!confirm ? (
        <div className="mt-3 flex gap-2">
          <Btn tone="red" disabled={taken} onClick={() => setConfirm(true)}>
            {t('paisapur.loan.take')}
          </Btn>
          <Btn onClick={onClose}>{t('paisapur.loan.just_looking')}</Btn>
        </div>
      ) : (
        <div className="mt-3 rounded bg-amber-100 p-2 text-sm">
          <p>{t('paisapur.loan.confirm', { total: rupees(cost.total), months })}</p>
          <div className="mt-2 flex gap-2">
            <Btn
              tone="red"
              onClick={() => {
                const e = act({ type: 'takeLoan', kind, amount: amountValue, months });
                if (!e) onClose();
                else err.run(act, { type: 'takeLoan', kind, amount: amountValue, months });
              }}
            >
              {t('paisapur.loan.sign')}
            </Btn>
            <Btn onClick={() => setConfirm(false)}>{t('paisapur.loan.cancel')}</Btn>
          </div>
        </div>
      )}
      {err.view}
    </Window>
  );
}

// ── Bonds ───────────────────────────────────────────────────────────────

export function BondPanel({ life, act, onClose }: { life: LifeState; act: Act; onClose: () => void }) {
  const err = useError();
  return (
    <Window title={t('maps.bondoffice')} onClose={onClose}>
      <p className="text-sm">{t('paisapur.bonds.intro', { rate: RULES.bondRatePa * 100, months: RULES.bondMonths })}</p>
      <div className="mt-2">
        <Amounts
          values={[500, 1000, 2000]}
          label={(n) => t('paisapur.bonds.buy', { amount: rupees(n), value: rupees(n * (1 + RULES.bondRatePa / 12) ** RULES.bondMonths) })}
          onPick={(n) => err.run(act, { type: 'buyBond', amount: n })}
        />
      </div>
      {life.bonds.map((b) => (
        <Row key={b.id} label={t('paisapur.bonds.row', { amount: rupees(b.amount), month: b.startMonth + b.months })} value={rupees(depositValue(b, life.month))} />
      ))}
      <p className="mt-2 text-xs text-slate-600">{t('paisapur.bonds.note')}</p>
      {err.view}
    </Window>
  );
}

// ── Exchange ────────────────────────────────────────────────────────────

function Spark({ seed, id, month }: { seed: number; id: AssetId; month: number }) {
  const from = Math.max(0, month - 6);
  const prices = Array.from({ length: month - from + 1 }, (_, i) => priceAt(seed, id, from + i));
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  return (
    <span className="inline-flex h-6 items-end gap-px" aria-hidden="true">
      {prices.map((p, i) => (
        <span key={i} className="w-1.5 bg-[#3a4a6b]" style={{ height: `${max === min ? 50 : 15 + ((p - min) / (max - min)) * 85}%` }} />
      ))}
    </span>
  );
}

export function ExchangePanel({ life, act, onClose }: { life: LifeState; act: Act; onClose: () => void }) {
  const err = useError();
  const value = holdingsValue(life);
  const invested = Object.values(life.holdings).reduce((s, h) => s + (h?.invested ?? 0), 0);
  return (
    <Window title={t('maps.exchange')} onClose={onClose} wide>
      <SimBanner />
      <Row label={t('paisapur.ex.bank')} value={rupees(life.bank.balance)} />
      <Row label={t('paisapur.ex.portfolio')} value={`${rupees(value)} (${invested ? percent(value / invested - 1) : '—'})`} />
      <ul className="mt-2 flex flex-col gap-2">
        {ASSETS.map((a) => {
          const price = priceAt(life.seed, a.id, life.month);
          const move = life.month > 0 ? change(life.seed, a.id, life.month - 1, life.month) : 0;
          const h = life.holdings[a.id];
          return (
            <li key={a.id} className="rounded border border-slate-300 bg-white p-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {t(`paisapur.asset.${a.id}.name`)} <span className="text-xs font-normal text-slate-600">· {t(`paisapur.asset_kind.${a.kind}`)}</span>
                  </p>
                  <p className="text-xs text-slate-700">{t(`paisapur.asset.${a.id}.about`)}</p>
                  {a.feePa > 0 && <p className="text-xs text-slate-700">{t('paisapur.ex.fee', { fee: (a.feePa * 100).toFixed(1) })}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Spark seed={life.seed} id={a.id} month={life.month} />
                  <span className="text-right">
                    <span className="block font-bold tabular-nums">{rupees(price)}</span>
                    <span className={`block text-xs tabular-nums ${move < 0 ? 'text-red-700' : 'text-green-800'}`}>{percent(move)}</span>
                  </span>
                </div>
              </div>
              {h && (
                <p className="mt-1 text-xs">
                  {t('paisapur.ex.holding', { value: rupees(h.units * price), invested: rupees(h.invested), pct: percent((h.units * price) / h.invested - 1) })}
                </p>
              )}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[100, 500, 1000].map((n) => (
                  <Btn key={n} onClick={() => err.run(act, { type: 'buyAsset', asset: a.id, amount: n })}>
                    {t('paisapur.ex.buy', { amount: rupees(n) })}
                  </Btn>
                ))}
                {h && (
                  <>
                    <Btn tone="red" onClick={() => err.run(act, { type: 'sellAsset', asset: a.id, units: h.units / 2 })}>
                      {t('paisapur.ex.sell_half')}
                    </Btn>
                    <Btn tone="red" onClick={() => err.run(act, { type: 'sellAsset', asset: a.id, units: h.units })}>
                      {t('paisapur.ex.sell_all')}
                    </Btn>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <h3 className="mt-3 font-bold">{t('paisapur.ex.sip')}</h3>
      <p className="text-xs text-slate-600">{t('paisapur.ex.sip_note')}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {[0, 100, 200, 500].map((n) => (
          <Btn key={n} tone={life.bank.sip === n ? 'green' : 'grey'} onClick={() => err.run(act, { type: 'setSip', amount: n })}>
            {n ? rupees(n) : t('paisapur.off')}
          </Btn>
        ))}
      </div>
      {err.view}
    </Window>
  );
}

export function NewsPanel({ life, onClose }: { life: LifeState; onClose: () => void }) {
  const h = headline(life.seed, life.month);
  return (
    <Window title={t('paisapur.news.title')} onClose={onClose}>
      <SimBanner />
      <p className="text-lg font-bold">{t(`paisapur.news.mood_${h.mood}`)}</p>
      {life.month > 0 && (
        <p className="mt-1">{t(h.move >= 0 ? 'paisapur.news.up' : 'paisapur.news.down', { name: t(`paisapur.asset.${h.id}.name`), pct: percent(h.move) })}</p>
      )}
      <p className="mt-2 rounded bg-slate-100 p-2 text-sm italic">{t('paisapur.news.rumour')}</p>
      <p className="mt-2 text-xs text-slate-600">{t('paisapur.news.note')}</p>
    </Window>
  );
}

// ── Night summary ───────────────────────────────────────────────────────

export function NightSummary({ before, life, onClose }: { before: LifeState; life: LifeState; onClose: () => void }) {
  const spent = monthSummary(life, before.month);
  const morning = monthSummary(life, life.month);
  const lines = [...spent, ...morning];
  return (
    <Window title={t('paisapur.night.title', { n: life.month })} onClose={onClose}>
      {life.flags.missed_needs && <p className="mb-2 rounded bg-red-100 p-2 text-sm">{t('paisapur.night.missed_needs')}</p>}
      <ul className="text-sm">
        {lines.map((l, i) => (
          <li key={i} className="flex justify-between border-b border-slate-200 py-0.5">
            <span>{t(`paisapur.reason.${l.reason}`)}</span>
            <span className={`tabular-nums ${l.amount < 0 ? 'text-red-700' : 'text-green-800'}`}>{rupees(l.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <Row label={t('paisapur.night.worth')} value={`${rupees(netWorth(before))} → ${rupees(netWorth(life))}`} />
        <Row label={t('paisapur.night.peace')} value={`${before.peace} → ${life.peace}`} />
        <Row label={t('paisapur.night.needs_next')} value={rupees(needsCost(life))} />
      </div>
      <button type="button" autoFocus onClick={onClose} className="mt-3 w-full rounded bg-[#3a4a6b] py-2 font-bold text-white">
        {t('paisapur.night.wake')}
      </button>
    </Window>
  );
}

// ── Start menu ──────────────────────────────────────────────────────────

export function Wallet({ life }: { life: LifeState }) {
  const deposits = life.deposits.reduce((s, d) => s + depositValue(d, life.month), 0);
  const bonds = life.bonds.reduce((s, b) => s + depositValue(b, life.month), 0);
  return (
    <div className="text-sm">
      <h3 className="font-bold">{t('paisapur.wallet.assets')}</h3>
      <Row label={t('paisapur.bank.cash')} value={rupees(life.cash)} />
      <Row label={t('paisapur.bank.balance')} value={life.bank.open ? rupees(life.bank.balance) : t('paisapur.wallet.no_account')} />
      <Row label={t('paisapur.bank.pot', { goal: t(`paisapur.goal.${life.goal.id}`) })} value={`${rupees(life.pot)} / ${rupees(life.goal.target)}`} />
      {deposits > 0 && <Row label={t('paisapur.wallet.fds')} value={rupees(deposits)} />}
      {bonds > 0 && <Row label={t('paisapur.wallet.bonds')} value={rupees(bonds)} />}
      {holdingsValue(life) > 0 && <Row label={t('paisapur.wallet.investments')} value={rupees(holdingsValue(life))} />}
      <h3 className="mt-2 font-bold">{t('paisapur.wallet.liabilities')}</h3>
      <Row label={t('paisapur.wallet.debts')} value={rupees(debtTotal(life))} />
      <Row label={t('paisapur.wallet.net_worth')} value={rupees(netWorth(life))} strong />
      {life.goalsDone.length > 0 && (
        <Row label={t('paisapur.wallet.goals_done')} value={life.goalsDone.map((g) => t(`paisapur.goal.${g}`)).join(', ')} />
      )}
      <h3 className="mt-2 font-bold">{t('paisapur.wallet.month')}</h3>
      <Row label={t('paisapur.wallet.income')} value={rupees(incomeFor(life, life.month + 1))} />
      <Row label={t('paisapur.wallet.needs')} value={rupees(needsCost(life))} />
      <Row label={t('paisapur.wallet.fund')} value={t('paisapur.wallet.fund_months', { n: Math.floor(emergencyFund(life) / Math.max(1, needsCost(life))) })} />
      {life.bank.autoSave > 0 && <Row label={t('paisapur.bank.autosave')} value={rupees(life.bank.autoSave)} />}
      {life.bank.sip > 0 && <Row label={t('paisapur.ex.sip')} value={rupees(life.bank.sip)} />}
      {life.creditScore !== null && <Row label={t('paisapur.bank.score')} value={life.creditScore} />}
      <Row label={t('paisapur.wallet.meters')} value={t('paisapur.wallet.meter_values', { peace: life.peace, safety: life.safety, trust: life.trust })} />
    </div>
  );
}

export function Journal({ life }: { life: LifeState }) {
  const [open, setOpen] = useState<string | null>(null);
  const seen = CONCEPTS.filter((c) => life.journal[c.id]).length;
  const mastered = CONCEPTS.filter((c) => life.journal[c.id] === 'mastered').length;
  return (
    <div>
      <p className="text-sm">{t('paisapur.journal.count', { seen, mastered, total: CONCEPTS.length })}</p>
      {[0, 1, 2, 3, 4, 5, 6].map((ch) => (
        <section key={ch} className="mt-2">
          <h3 className="text-sm font-bold text-[#3a4a6b]">{t(`paisapur.chapter.${ch}`)}</h3>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {CONCEPTS.filter((c) => c.chapter === ch).map((c) => {
              const state = life.journal[c.id];
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={!state}
                    onClick={() => setOpen(open === c.id ? null : c.id)}
                    className="flex w-full items-center gap-2 rounded bg-white px-2 py-1 text-left text-sm disabled:opacity-50"
                  >
                    <span aria-hidden="true">{state ? c.icon : '❔'}</span>
                    <span className="flex-1">{state ? t(`concepts.${c.id}.title`) : '???'}</span>
                    {state === 'mastered' && <span title={t('paisapur.journal.mastered')}>⭐</span>}
                  </button>
                  {open === c.id && (
                    <div className="mt-1 rounded bg-[#fff6d6] p-2 text-sm">
                      <p>{t(`concepts.${c.id}.body`)}</p>
                      <p className="mt-1 italic">{t(`concepts.${c.id}.example`)}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function Badges({ life }: { life: LifeState }) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {BADGES.map((b) => {
        const has = life.badges.includes(b);
        return (
          <li key={b} className={`rounded p-2 text-center ${has ? 'bg-amber-100' : 'bg-slate-200'}`}>
            <span className="block text-3xl" aria-hidden="true">
              {has ? t(`paisapur.badge.${b}.icon`) : '🔒'}
            </span>
            <span className="text-sm font-bold">{has ? t(`paisapur.badge.${b}.name`) : '???'}</span>
            <span className="block text-xs">{t(`paisapur.badge.${b}.from`)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function YearPanel({ life, name, onClose }: { life: LifeState; name: string; onClose: () => void }) {
  const mastered = CONCEPTS.filter((c) => life.journal[c.id] === 'mastered').length;
  const seen = CONCEPTS.filter((c) => life.journal[c.id]).length;
  return (
    <Window title={t('paisapur.year.title', { name })} onClose={onClose}>
      <Row label={t('paisapur.year.months')} value={life.month} />
      <Row label={t('paisapur.wallet.net_worth')} value={rupees(netWorth(life))} />
      <Row label={t('paisapur.year.started')} value={rupees(1300)} />
      <Row label={t('paisapur.year.badges')} value={`${life.badges.length} / ${BADGES.length}`} />
      <Row label={t('paisapur.year.concepts')} value={t('paisapur.year.concepts_value', { seen, mastered, total: CONCEPTS.length })} />
      <Row label={t('paisapur.wallet.debts')} value={rupees(debtTotal(life))} />
      <Row label={t('paisapur.night.peace')} value={life.peace} />
      <p className="mt-3 text-sm">{t(debtTotal(life) > 0 ? 'paisapur.year.debt_note' : 'paisapur.year.free_note')}</p>
      <div className="mt-3">
        <Badges life={life} />
      </div>
    </Window>
  );
}

// ── Bag ─────────────────────────────────────────────────────────────────

export function Bag({ life, onUse }: { life: LifeState; onUse: (to: 'journal' | 'wallet') => void }) {
  const [pocket, setPocket] = useState<Pocket>('key');
  const [cursor, setCursor] = useState(0);
  const all = bagContents(life, rupees);
  const list = all.filter((i) => i.pocket === pocket);
  const selected = list[Math.min(cursor, list.length - 1)];
  const turn = (d: 1 | -1) => {
    setPocket(POCKETS[(POCKETS.indexOf(pocket) + d + POCKETS.length) % POCKETS.length]!);
    setCursor(0);
  };
  const vars = (i: BagItem) => ({
    ...i.vars,
    ...(typeof i.vars.item === 'string' ? { item: t(`paisapur.item.${i.vars.item}`) } : {}),
    ...(typeof i.vars.kind === 'string' ? { kind: t(`paisapur.lender.${i.vars.kind}`) } : {}),
  });
  useKeys((k) => {
    if (k === 'ArrowLeft' || k === 'a') turn(-1);
    if (k === 'ArrowRight' || k === 'd') turn(1);
    if (k === 'ArrowUp' || k === 'w') setCursor((c) => Math.max(0, c - 1));
    if (k === 'ArrowDown' || k === 's') setCursor((c) => Math.min(list.length - 1, c + 1));
    if (KEY_A.has(k) && selected?.use) onUse(selected.use);
  });
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex shrink-0 flex-row items-center justify-between gap-2 rounded bg-[#e9c46a] p-2 sm:w-40 sm:flex-col">
          <span className="text-5xl" aria-hidden="true">
            🎒
          </span>
          <div className="flex items-center gap-1" role="tablist" aria-label={t('bag.title')}>
            <button type="button" aria-label="◀" onClick={() => turn(-1)} className="rounded bg-white/70 px-2 font-bold">
              ◀
            </button>
            <span className="min-w-24 text-center text-sm font-bold" role="tab" aria-selected="true">
              {t(`bag.pocket.${pocket}`)}
            </span>
            <button type="button" aria-label="▶" onClick={() => turn(1)} className="rounded bg-white/70 px-2 font-bold">
              ▶
            </button>
          </div>
          <span className="hidden gap-1 sm:flex" aria-hidden="true">
            {POCKETS.map((p) => (
              <span key={p} className={`h-2 w-2 rounded-full ${p === pocket ? 'bg-[#3a4a6b]' : 'bg-white/70'}`} />
            ))}
          </span>
        </div>
        <ul className="flex-1 rounded bg-white p-1" role="listbox" aria-label={t(`bag.pocket.${pocket}`)}>
          {list.length === 0 && <li className="p-2 text-sm">{t('bag.empty')}</li>}
          {list.map((i, n) => (
            <li key={i.key}>
              <button
                type="button"
                role="option"
                aria-selected={n === cursor}
                onClick={() => setCursor(n)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${n === cursor ? 'bg-[#e8eef8]' : ''}`}
              >
                <span className={n === cursor ? '' : 'invisible'} aria-hidden="true">
                  ▶
                </span>
                <span aria-hidden="true">{i.icon}</span>
                <span className="flex-1">{t(`bag.item.${i.id}.name`, vars(i))}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {selected && (
        <div className="mt-2 rounded border-2 border-[#3a4a6b] bg-[#fff6d6] p-2 text-sm" aria-live="polite">
          <p>
            {t(`bag.item.${selected.id}.desc`, vars(selected))}
            {selected.vars.cracked ? ` ${t('bag.cracked')}` : ''}
          </p>
          {selected.use && (
            <button type="button" onClick={() => onUse(selected.use!)} className="mt-1 rounded bg-[#3a4a6b] px-3 py-1 font-bold text-white">
              {t('bag.use')}
            </button>
          )}
        </div>
      )}
      <p className="mt-1 text-xs text-slate-500">{t('bag.hint')}</p>
    </div>
  );
}
