/**
 * The reward after a room, in the spirit of TryHackMe's room-complete screen:
 * stars, XP counting up, a rank bar that fills, new badges and cards, and a
 * big "Next room" button so there is always a reason to keep going.
 */
import { useEffect, useState } from 'react';
import { t } from '@/platform';
import { Button, Card, SectionLabel } from '@/ui';
import { Confetti } from './phone/Confetti';
import { Icon } from './phone/Icon';
import { TellCard } from './phone/TellCard';
import { rankProgress, type Gain, type Progress } from './logic/progress';
import type { TellKind } from './phone/logic/types';

/** Counts up to `target`. Jumps straight to it when the student prefers reduced motion. */
function useCountUp(target: number, ms = 1100) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const [value, setValue] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce || target === 0) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms, reduce]);
  return reduce ? target : value;
}

export type RewardProps = {
  entryTitle: string;
  gain: Gain;
  progress: Progress;
  next?: { title: string; brief: string };
  backLabel: string;
  onNext: () => void;
  onReplay: () => void;
  onBack: () => void;
};

export function RewardScreen({ entryTitle, gain, progress, next, backLabel, onNext, onReplay, onBack }: RewardProps) {
  const xp = useCountUp(gain.total);
  const before = rankProgress(gain.xpBefore);
  const after = rankProgress(gain.xpAfter);
  const rankUp = gain.rankBefore !== gain.rankAfter;
  const [fill, setFill] = useState(before.fraction);
  useEffect(() => {
    const id = window.setTimeout(() => setFill(after.fraction), 400);
    return () => window.clearTimeout(id);
  }, [after.fraction]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pt-10 lg:pt-14">
      <Confetti trigger={1} count={gain.stars === 3 ? 110 : gain.stars === 2 ? 70 : 40} />
      <div className="animate-rise text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brand">{t('safe.reward.title')}</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{entryTitle}</h1>
        <div className="mt-5 flex justify-center gap-2" role="img" aria-label={t('safe.reward.stars', { n: gain.stars })}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= gain.stars ? 'animate-star text-warn' : 'text-surface-3'} style={{ animationDelay: `${n * 0.18}s` }}>
              <Icon name="star" className="h-12 w-12 fill-current" />
            </span>
          ))}
        </div>
        <p className="mt-4 text-5xl font-bold tabular-nums text-brand">+{xp}<span className="ml-1 text-lg font-bold text-ink-soft">{t('safe.reward.xp')}</span></p>
      </div>

      <Card className="animate-rise space-y-2" >
        {gain.lines.length === 0 ? (
          <p className="text-sm text-muted">{t('safe.reward.noXp')}</p>
        ) : (
          gain.lines.map((l) => (
            <div key={l.key} className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">{t(`safe.reward.line.${l.key}`, { n: l.arg ?? 0 })}</span>
              <span className="font-mono font-bold text-brand">+{l.xp}</span>
            </div>
          ))
        )}
      </Card>

      <Card className="animate-rise space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('safe.reward.rank')}</SectionLabel>
          <span className="font-mono text-xs text-muted">{progress.xp} {t('safe.reward.xp')}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-xp/15 text-xp"><Icon name="shield" className="h-6 w-6" /></span>
          <div className="flex-1">
            <p className="text-lg font-bold text-ink">{t(`safe.rank.${gain.rankAfter}`)}</p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-xp transition-[width] duration-1000" style={{ width: `${Math.round(fill * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{after.next ? t('safe.reward.toNext', { n: after.toNext, rank: t(`safe.rank.${after.next}`) }) : t('safe.reward.top')}</p>
          </div>
        </div>
        {rankUp && <p className="rounded-lg bg-xp/15 p-2 text-center text-sm font-bold text-xp">{t('safe.reward.rankUp')}: {t(`safe.rank.${gain.rankBefore}`)} to {t(`safe.rank.${gain.rankAfter}`)}</p>}
      </Card>

      {gain.newBadges.length > 0 && (
        <section className="animate-rise space-y-2">
          <SectionLabel>{t('safe.reward.newBadge')}</SectionLabel>
          {gain.newBadges.map((b) => (
            <div key={b} className="flex items-center gap-3 rounded-xl border border-warn/50 bg-warn/10 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warn/20 text-warn"><Icon name="star" className="h-5 w-5 fill-current" /></span>
              <div>
                <p className="font-bold text-ink">{t(`safe.badge.${b}.name`)}</p>
                <p className="text-xs text-ink-soft">{t(`safe.badge.${b}.desc`)}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {gain.newCards.length > 0 && (
        <section className="animate-rise space-y-2">
          <SectionLabel>{t('safe.reward.line.newCards', { n: gain.newCards.length })}</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {gain.newCards.map((k) => <TellCard key={k} kind={k as TellKind} found isNew />)}
          </div>
        </section>
      )}

      <div className="animate-rise space-y-3 pt-2">
        {next ? (
          <button type="button" onClick={onNext} className="flex w-full items-center gap-4 rounded-xl border-2 border-brand bg-brand/10 p-4 text-left transition hover:bg-brand/20">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('safe.reward.next')}</p>
              <p className="text-lg font-bold text-ink">{next.title}</p>
              <p className="text-sm text-ink-soft">{next.brief}</p>
            </div>
            <Icon name="arrowRight" className="h-6 w-6 text-brand" />
          </button>
        ) : (
          <p className="text-center text-sm font-bold text-brand">{t('safe.reward.allDone')}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={onReplay}>{t('safe.reward.replay')}</Button>
          <Button variant="ghost" onClick={onBack}>{backLabel}</Button>
        </div>
      </div>
    </div>
  );
}
