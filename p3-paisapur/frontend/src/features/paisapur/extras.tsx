/**
 * The bigger screens: Scam Duels (turn-based scam battles), the What-If
 * Machine (rewind and compare two lives) and Kabir's parallel life.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { debtTotal, emergencyFund, GOAL_DEFS, netWorth, type LifeState } from '@/core/engine';
import { simulateKabir, type RivalBeat } from '@/core/rival';
import { answer as answerDuel, currentRound, duelById, SHIELDS, startDuel, type DuelState, type Effect } from '@/core/story/duel';
import { compare, explain, scamLosses, type Checkpoint, type Metric, type OtherLife } from '@/core/timeline';
import { t } from '@/platform';
import { KEY_A, KEY_B, useKeys } from './input';
import { rupees } from './logic/format';
import { Sprite } from './sprite';
import { Box } from './ui';

// ── Sprites in the DOM (for the battle screen) ──────────────────────────

const FOE_EMOJI: Record<string, string> = { phone: '📱', caller: '📞' };

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold">{label}</span>
      <span className="flex flex-1 gap-1" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className="h-2.5 flex-1 rounded-sm border border-black/40" style={{ background: i < value ? color : '#d8d8d0' }} />
        ))}
      </span>
    </div>
  );
}

// ── Scam Duel ───────────────────────────────────────────────────────────

type Phase = 'intro' | 'attack' | 'choose' | 'result' | 'end';

export function DuelScreen({
  id,
  playerName,
  playerSprite,
  instant,
  onAnswer,
  onDone,
}: {
  id: string;
  playerName: string;
  playerSprite: string;
  instant: boolean;
  onAnswer: (tactic: string, option: string, effect: Effect) => void;
  onDone: (outcome: 'win' | 'lose') => void;
}) {
  const def = duelById(id);
  const [state, setState] = useState<DuelState>(() => startDuel(id));
  const [phase, setPhase] = useState<Phase>('intro');
  const [cursor, setCursor] = useState(0);
  const foe = t(`duel.foe.${def.foe}`);
  const round = currentRound(state);

  const pick = (optionId: string) => {
    const next = answerDuel(state, optionId);
    onAnswer(round.tactic, optionId, next.last!.effect);
    setState(next);
    setPhase('result');
  };

  const advance = () => {
    if (phase === 'intro') setPhase('attack');
    else if (phase === 'attack') {
      setCursor(0);
      setPhase('choose');
    } else if (phase === 'result') setPhase(state.outcome === 'on' ? 'attack' : 'end');
    else if (phase === 'end') onDone(state.outcome === 'win' ? 'win' : 'lose');
  };

  useKeys((k) => {
    if (phase === 'choose') {
      if (k === 'ArrowUp' || k === 'w') setCursor((c) => (c + round.options.length - 1) % round.options.length);
      if (k === 'ArrowDown' || k === 's') setCursor((c) => (c + 1) % round.options.length);
      if (KEY_A.has(k)) pick(round.options[cursor]!.id);
      return;
    }
    if (KEY_A.has(k) || KEY_B.has(k)) advance();
  });

  const message = (() => {
    switch (phase) {
      case 'intro':
        return `${t('duel.ui.appears', { foe })} ${t('duel.ui.stake', { amount: rupees(def.stake) })}`;
      case 'attack':
        return `${t('duel.ui.used', { foe, tactic: t(`duel.tactic.${round.tactic}`) })} ${t(`duel.${id}.${round.tactic}.line`)}`;
      case 'choose':
        return t('duel.ui.what_do');
      case 'result': {
        const last = state.last!;
        const head = t(`duel.ui.${last.effect}`, { foe });
        return last.effect === 'counter' ? `${head} ${t(`duel.tell.${last.tactic}`)}` : head;
      }
      case 'end':
        return t(state.outcome === 'win' ? 'duel.ui.win' : 'duel.ui.lose', { foe });
    }
  })();

  return (
    <div className="mx-auto w-full max-w-2xl" role="dialog" aria-modal="true" aria-label={foe}>
      <div className={`overflow-hidden rounded-md border-4 border-[#3a4a6b] ${instant ? '' : 'animate-[pulse_0.4s_ease-out_1]'}`}>
        <div className="relative h-56 bg-gradient-to-b from-[#bfe3f2] via-[#e9f5d8] to-[#9fd38a] sm:h-64">
          {/* Foe: top right, with its info box top left */}
          <div className="absolute top-3 left-3 w-[46%]">
            <Box>
              <p className="font-bold">{foe}</p>
              <Bar label={t('duel.ui.pressure')} value={state.pressure} max={def.rounds.length} color="#e5484d" />
            </Box>
          </div>
          <div className="absolute top-4 right-6 flex h-28 w-28 items-end justify-center rounded-[50%] bg-[#7fbf6a]/50 pb-2">
            {FOE_EMOJI[def.foe] ? (
              <span className="text-7xl" role="img" aria-label={foe}>
                {FOE_EMOJI[def.foe]}
              </span>
            ) : (
              <Sprite sprite={def.foe} dir="down" size={96} label={foe} />
            )}
          </div>
          {/* Player: bottom left (seen from behind), info box bottom right */}
          <div className="absolute bottom-0 left-8">
            <Sprite sprite={playerSprite} dir="up" size={112} />
          </div>
          <div className="absolute right-3 bottom-3 w-[46%]">
            <Box>
              <p className="font-bold">{playerName}</p>
              <Bar label={t('duel.ui.shields')} value={state.shields} max={SHIELDS} color="#2a78d6" />
            </Box>
          </div>
        </div>
        <div className="bg-[#2b3245] p-2">
          <Box>
            <p className="min-h-[3rem] text-base leading-snug md:text-lg" aria-live="polite">
              {message}
            </p>
            {phase === 'choose' ? (
              <ul className="mt-2 grid gap-1.5">
                {round.options.map((o, i) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => pick(o.id)}
                      className={`flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-base ${i === cursor ? 'bg-[#e8eef8]' : ''}`}
                    >
                      <span className={i === cursor ? '' : 'invisible'} aria-hidden="true">
                        ▶
                      </span>
                      {t(`duel.${id}.${round.tactic}.${o.id}`)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                {phase === 'end' && state.spotted.length > 0 && (
                  <div className="mt-2 rounded bg-[#fff6d6] p-2 text-sm">
                    <p className="font-bold">{t('duel.ui.tells')}</p>
                    <ul className="list-disc pl-5">
                      {state.spotted.map((tac) => (
                        <li key={tac}>{t(`duel.tell.${tac}`)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button type="button" autoFocus onClick={advance} className="mt-2 w-full rounded bg-[#3a4a6b] py-2 font-bold text-white">
                  {t('duel.ui.continue')} ▼
                </button>
              </>
            )}
          </Box>
        </div>
      </div>
    </div>
  );
}

// ── Shared window frame ─────────────────────────────────────────────────

function Frame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useKeys((k) => {
    if (KEY_B.has(k)) onClose();
  });
  return (
    <div className="mx-auto flex max-h-full w-full max-w-3xl flex-col" role="dialog" aria-modal="true" aria-label={title}>
      <Box className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b-2 border-[#8fb0d8] pb-2">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded bg-[#3a4a6b] px-3 py-1 text-sm font-bold text-white">
            {t('paisapur.close')}
          </button>
        </div>
        <div className="mt-2 max-h-[70dvh] overflow-y-auto pr-1">{children}</div>
      </Box>
    </div>
  );
}

const METRIC_FORMAT: Record<Metric, (n: number) => string> = {
  worth: rupees,
  savings: rupees,
  debt: rupees,
  scams: rupees,
  peace: (n) => `${n}/100`,
  goal: (n) => String(n),
  badges: (n) => `${n}/6`,
};

function CompareTable({ a, b, aLabel, bLabel }: { a: LifeState; b: LifeState; aLabel: string; bLabel: string }) {
  const rows = compare(a, b);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left">
          <th className="py-1" />
          <th className="py-1 text-right">{aLabel}</th>
          <th className="py-1 text-right">{bLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.metric} className="border-t border-slate-200">
            <td className="py-1">{t(`whatif.metric.${r.metric}`)}</td>
            <td className="py-1 text-right tabular-nums">{METRIC_FORMAT[r.metric](r.a)}</td>
            <td className="py-1 text-right tabular-nums">{METRIC_FORMAT[r.metric](r.b)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Why({ a, b, aLabel, bLabel }: { a: LifeState; b: LifeState; aLabel: string; bLabel: string }) {
  const reasons = explain(compare(a, b));
  if (!reasons.length) return <p className="mt-2 text-sm">{t('whatif.why.same')}</p>;
  return (
    <ul className="mt-2 list-disc pl-5 text-sm">
      {reasons.map((r) => (
        <li key={r.key}>{t(r.key, { amount: rupees(r.amount).replace('₹', ''), better: r.better === 'a' ? aLabel : bLabel })}</li>
      ))}
    </ul>
  );
}

// ── What-If Machine ─────────────────────────────────────────────────────

export function WhatIfPanel({
  life,
  checkpoints,
  other,
  onRewind,
  onSwitch,
  onClose,
}: {
  life: LifeState;
  checkpoints: Checkpoint[];
  other: OtherLife | null;
  onRewind: (id: string) => void;
  onSwitch: () => void;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const here = t('whatif.this_life');
  const there = t('whatif.other_life');
  return (
    <Frame title={t('whatif.title')} onClose={onClose}>
      <p className="text-sm">{t('whatif.intro')}</p>
      {other && (
        <section className="mt-3 rounded bg-white p-2">
          <h3 className="font-bold">{t('whatif.compare_title')}</h3>
          <p className="text-xs text-slate-600">{t('whatif.compare_note', { label: t(other.label) })}</p>
          <CompareTable a={life} b={other.life} aLabel={here} bLabel={there} />
          <Why a={life} b={other.life} aLabel={here} bLabel={there} />
          <button type="button" onClick={onSwitch} className="mt-2 rounded bg-[#3a4a6b] px-3 py-1.5 text-sm font-bold text-white">
            {t('whatif.switch')}
          </button>
        </section>
      )}
      <h3 className="mt-3 font-bold">{t('whatif.checkpoints')}</h3>
      {checkpoints.length === 0 && <p className="text-sm">{t('whatif.none')}</p>}
      <ul className="flex flex-col gap-1.5">
        {[...checkpoints].reverse().map((cp) => (
          <li key={cp.id} className="rounded border border-slate-300 bg-white p-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>
                <span className="font-bold">{t(cp.label)}</span>
                <span className="block text-xs text-slate-600">{t('whatif.when', { month: cp.month, chapter: cp.chapter })}</span>
              </span>
              {confirm === cp.id ? (
                <span className="flex gap-1.5">
                  <button type="button" onClick={() => onRewind(cp.id)} className="rounded bg-red-700 px-2 py-1 font-bold text-white">
                    {t('whatif.go')}
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} className="rounded bg-slate-500 px-2 py-1 font-bold text-white">
                    {t('paisapur.loan.cancel')}
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirm(cp.id)} className="rounded bg-[#3a4a6b] px-2 py-1 font-bold text-white">
                  {t('whatif.rewind')}
                </button>
              )}
            </div>
            {confirm === cp.id && <p className="mt-1 text-xs">{t('whatif.confirm')}</p>}
          </li>
        ))}
      </ul>
    </Frame>
  );
}

// ── Kabir's parallel life ───────────────────────────────────────────────

const YOU = '#2a78d6';
const KABIR = '#eb6834';

/** Net worth over the months, you vs Kabir. One axis, two thin lines, a zero line, hover for values. */
function WorthChart({ you, kabir }: { you: { month: number; worth: number }[]; kabir: { month: number; worth: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 520;
  const H = 200;
  const pad = { l: 56, r: 64, t: 12, b: 26 };
  const months = [...new Set([...you, ...kabir].map((p) => p.month))].sort((a, b) => a - b);
  if (months.length < 2) return <p className="text-sm">{t('rival.chart_soon')}</p>;
  const all = [...you, ...kabir].map((p) => p.worth).concat(0);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const x = (m: number) => pad.l + ((m - months[0]!) / (months[months.length - 1]! - months[0]!)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const path = (pts: { month: number; worth: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.month).toFixed(1)},${y(p.worth).toFixed(1)}`).join(' ');
  const ticks = [min, 0, max].filter((v, i, arr) => arr.indexOf(v) === i);
  const at = (pts: { month: number; worth: number }[], m: number) => pts.find((p) => p.month === m);
  const lastYou = you[you.length - 1];
  const lastKabir = kabir[kabir.length - 1];

  return (
    <figure className="mt-2">
      <figcaption className="mb-1 flex flex-wrap gap-4 text-xs text-slate-700">
        <span className="flex items-center gap-1">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="18" y2="3" stroke={YOU} strokeWidth="2" />
          </svg>
          {t('rival.you')}
        </span>
        <span className="flex items-center gap-1">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="18" y2="3" stroke={KABIR} strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          {t('rival.kabir')}
        </span>
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={t('rival.chart_label')}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            let best = months[0]!;
            for (const m of months) if (Math.abs(x(m) - px) < Math.abs(x(best) - px)) best = m;
            setHover(best);
          }}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#8a8a80' : '#e2e2da'} strokeWidth="1" />
              <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#5b5b55">
                {rupees(v)}
              </text>
            </g>
          ))}
          {months.map((m) => (
            <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize="11" fill="#5b5b55">
              {m}
            </text>
          ))}
          <path d={path(kabir)} fill="none" stroke={KABIR} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
          <path d={path(you)} fill="none" stroke={YOU} strokeWidth="2" strokeLinejoin="round" />
          {lastYou && (
            <text x={x(lastYou.month) + 6} y={y(lastYou.worth) + 4} fontSize="11" fill="#2b2b2b">
              {t('rival.you')}
            </text>
          )}
          {lastKabir && (
            <text x={x(lastKabir.month) + 6} y={y(lastKabir.worth) + 4} fontSize="11" fill="#2b2b2b">
              {t('rival.kabir')}
            </text>
          )}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#8a8a80" strokeWidth="1" />
              {[
                [at(you, hover), YOU],
                [at(kabir, hover), KABIR],
              ].map(([p, c], i) =>
                p && typeof p === 'object' ? <circle key={i} cx={x(p.month)} cy={y(p.worth)} r="4" fill={c as string} stroke="#f8f8f0" strokeWidth="2" /> : null,
              )}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-1 right-1 rounded bg-white/95 px-2 py-1 text-xs shadow">
            <p className="font-bold">{t('paisapur.hud.month', { n: hover })}</p>
            <p>
              {t('rival.you')}: {rupees(at(you, hover)?.worth ?? 0)}
            </p>
            <p>
              {t('rival.kabir')}: {rupees(at(kabir, hover)?.worth ?? 0)}
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}

export function RivalPanel({ life, onClose }: { life: LifeState; onClose: () => void }) {
  const kabir = useMemo(() => simulateKabir(life), [life]);
  const k = kabir.state;
  const you = t('rival.you');
  const him = t('rival.kabir');
  const youHistory = [{ month: 0, worth: 1300 }, ...life.history.map(({ month, worth }) => ({ month, worth }))];
  const kabirHistory = [{ month: 0, worth: 1300 }, ...k.history.map(({ month, worth }) => ({ month, worth }))];
  const ahead = netWorth(life) - netWorth(k);
  return (
    <Frame title={t('rival.title')} onClose={onClose}>
      <p className="text-sm">{t('rival.intro', { goal: t(`paisapur.goal.${GOAL_DEFS[k.goal.id] ? k.goal.id : 'phone'}`) })}</p>
      <WorthChart you={youHistory} kabir={kabirHistory} />
      <CompareTable a={life} b={k} aLabel={you} bLabel={him} />
      <p className="mt-2 rounded bg-[#e8eef8] p-2 text-sm font-bold">
        {ahead >= 0 ? t('rival.ahead', { amount: rupees(ahead) }) : t('rival.behind', { amount: rupees(-ahead) })}
      </p>
      <h3 className="mt-3 font-bold">{t('rival.diary')}</h3>
      {kabir.beats.length === 0 && <p className="text-sm">{t('rival.nothing_yet')}</p>}
      <ul className="flex flex-col gap-1 text-sm">
        {kabir.beats.map((b) => (
          <li key={`${b.month}-${b.beat}`} className="rounded bg-white p-2">
            <span className="font-bold">{t('paisapur.hud.month', { n: b.month })}: </span>
            {t(`rival.beat.${b.beat satisfies RivalBeat}`)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-600">
        {t('rival.numbers', { debt: rupees(debtTotal(k)), savings: rupees(emergencyFund(k)), scams: rupees(scamLosses(k)), score: k.creditScore ?? '—' })}
      </p>
    </Frame>
  );
}
