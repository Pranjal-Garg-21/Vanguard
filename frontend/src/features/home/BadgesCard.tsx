/**
 * The dashboard's badge shelf. It reads what the player has really earned: the six Paisapur badges (one per chapter,
 * from the saved game) and the Stay Safe achievements (from that section's progress). It reloads when the tab
 * comes back into view, so a badge won in the game is there when the player returns here.
 */
import { useCallback, useEffect, useState } from 'react';
import { BADGES as PAISAPUR_BADGES } from '@/core/story/content';
import { BADGES as SAFE_BADGES } from '@/games/safe/logic/progress';
import { loadProgress } from '@/games/safe/progressStore';
import { loadGame, t } from '@/platform';
import { Card, Icon, SectionLabel } from '@/ui';

type Earned = { paisapur: string[]; safe: string[] };

export function BadgesCard({ pid }: { pid: string }) {
  const [earned, setEarned] = useState<Earned | null>(null);

  const load = useCallback(async () => {
    const [save, progress] = await Promise.all([loadGame<{ life?: { badges?: string[] } }>(pid, 'paisapur'), loadProgress()]);
    setEarned({ paisapur: save?.life?.badges ?? [], safe: progress.badges });
  }, [pid]);

  useEffect(() => {
    void load();
    const again = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', again);
    window.addEventListener('focus', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      window.removeEventListener('focus', again);
    };
  }, [load]);

  const total = PAISAPUR_BADGES.length + SAFE_BADGES.length;
  const count = earned ? earned.paisapur.length + earned.safe.length : 0;

  return (
    <Card className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel>{t('home.badges.title')}</SectionLabel>
        <span className="text-sm font-bold tabular-nums text-brand">{t('home.badges.count', { n: count, total })}</span>
      </div>

      <Shelf title={t('home.badges.paisapur')} ids={PAISAPUR_BADGES} has={earned?.paisapur} name={(id) => t(`paisapur.badge.${id}.name`)} />
      <Shelf title={t('home.badges.safe')} ids={SAFE_BADGES} has={earned?.safe} name={(id) => t(`safe.badge.${id}.name`)} />

      <p className="text-xs text-muted">{t('home.badges.body')}</p>
    </Card>
  );
}

function Shelf({ title, ids, has, name }: { title: string; ids: readonly string[]; has: string[] | undefined; name: (id: string) => string }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold tracking-wide text-ink-soft uppercase">{title}</h3>
      <ul className="grid grid-cols-3 gap-2">
        {ids.map((id) => {
          const got = !!has?.includes(id);
          return (
            <li
              key={id}
              title={name(id)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition ${
                got ? 'border-warn/50 bg-warn/10' : 'border-dashed border-line-strong bg-bg opacity-60'
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-md ${got ? 'bg-warn/20 text-warn' : 'bg-surface-3 text-muted'}`}>
                <Icon name={got ? 'star' : 'lock'} className={`h-4 w-4 ${got ? 'fill-current' : ''}`} />
              </span>
              <span className={`text-[11px] leading-tight font-bold ${got ? 'text-ink' : 'text-muted'}`}>{name(id)}</span>
              <span className="sr-only">{t(got ? 'home.badges.earned' : 'home.badges.locked')}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
