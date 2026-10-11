/**
 * Student dashboard, laid out like TryHackMe's: top bar with streak and XP,
 * a "continue learning" card, the learning path, practice rooms, and a side
 * rail with the daily challenge and badges. Owner: P2 (placeholder content
 * until LifePath, Arcade and Progress land).
 */
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import {
  loadActiveProfile,
  recentEvents,
  refreshSyncStatus,
  switchPlayer,
  t,
  useActiveProfile,
  useSyncStatus,
  type GameEvent,
} from '@/platform';
import { ARCADE_SECTIONS, STAGES } from '@/content/stages';
import { avatarEmoji } from '@/features/setup';
import { Badge, Button, Card, ProgressBar, SectionLabel, Spinner } from '@/ui';
import { summariseEvents } from './stats';

const NAV = ['dashboard', 'learn', 'practice', 'compete'] as const;
const BADGE_SLOTS = 6;

export function Dashboard() {
  const navigate = useNavigate();
  const { profile, loaded } = useActiveProfile();
  const sync = useSyncStatus();
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    if (!loaded) void loadActiveProfile();
    void refreshSyncStatus();
  }, [loaded]);

  const pid = profile?.pid;
  useEffect(() => {
    if (pid) void recentEvents(1000).then((all) => setEvents(all.filter((e) => e.pid === pid)));
  }, [pid]);

  if (!loaded) return <Spinner />;
  if (!profile) return <Navigate to="/" replace />;

  const stats = summariseEvents(events);
  const syncLabel = sync.state === 'pending' ? t('home.sync.pending', { count: sync.pending }) : t(`home.sync.${sync.state}`);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2.5">
          <span className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-ink">P</span>
            <span className="hidden sm:inline">
              Money<span className="text-brand">Path</span>
            </span>
          </span>

          <nav className="hidden gap-1 md:flex" aria-label="Main">
            {NAV.map((key) => (
              <span
                key={key}
                aria-current={key === 'dashboard' ? 'page' : undefined}
                title={key === 'dashboard' ? undefined : t('home.soon')}
                className={`rounded-md px-3 py-2 text-sm font-bold ${key === 'dashboard' ? 'bg-surface-2 text-brand' : 'cursor-not-allowed text-muted'}`}
              >
                {t(`home.nav.${key}`)}
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4 text-sm font-bold">
            <span title={t('home.stats.streak')}>
              <span className="text-brand">{stats.streak}</span> <span className="text-muted">d</span>
            </span>
            <span title={t('home.stats.xp')}>
              <span className="text-brand">{stats.xp}</span> <span className="text-muted">XP</span>
            </span>
            <button
              type="button"
              aria-label={t('home.switchPlayer')}
              title={t('home.switchPlayer')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-xl hover:border-brand"
              onClick={async () => {
                await switchPlayer();
                navigate('/who');
              }}
            >
              {avatarEmoji(profile.avatarId)}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{t('home.greeting', { name: profile.displayName })}</h1>
          <Badge tone={sync.state === 'synced' ? 'good' : sync.state === 'error' ? 'bad' : 'neutral'}>{syncLabel}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={t('home.stats.streak')} value={stats.streak} />
          <Stat label={t('home.stats.xp')} value={stats.xp} />
          <Stat label={t('home.stats.answers')} value={stats.answers} />
          <Stat label={t('home.stats.concepts')} value={stats.concepts} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <Card className="space-y-4">
              <SectionLabel>{t('home.continue.title')}</SectionLabel>
              <div>
                <h2 className="text-xl font-bold">{t('home.lifepath.title')}</h2>
                <p className="mt-1 text-sm text-ink-soft">{t('home.lifepath.body')}</p>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs font-bold text-muted">
                  <span>{t('home.continue.stage', { n: 1, total: STAGES.length })}</span>
                  <span>0%</span>
                </div>
                <ProgressBar value={0} />
              </div>
              <Button disabled>{t('home.continue.start')}</Button>
            </Card>

            <section className="space-y-3">
              <SectionLabel>{t('home.stagesTitle')}</SectionLabel>
              <ol className="space-y-2">
                {STAGES.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                        i === 0 ? 'bg-brand text-brand-ink' : 'bg-surface-3 text-muted'
                      }`}
                    >
                      {s.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">{s.name}</h3>
                      <p className="truncate text-sm text-muted">{s.blurb}</p>
                    </div>
                    <Badge tone={i === 0 ? 'good' : 'neutral'}>{i === 0 ? t('home.soon') : t('home.locked')}</Badge>
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-3">
              <SectionLabel>{t('home.practiceTitle')}</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-3">
                {ARCADE_SECTIONS.map((a) => (
                  <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
                    <Badge>{a.level}</Badge>
                    <h3 className="font-bold">{a.name}</h3>
                    <p className="flex-1 text-sm text-muted">{a.blurb}</p>
                    <span className="text-xs font-bold text-muted uppercase">{t('home.soon')}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <Card className="space-y-3">
              <SectionLabel>{t('home.daily.title')}</SectionLabel>
              <p className="text-sm text-ink-soft">{t('home.daily.body')}</p>
              <Button variant="secondary" className="w-full" disabled>
                {t('home.soon')}
              </Button>
            </Card>

            <Card className="space-y-3">
              <SectionLabel>{t('home.badges.title')}</SectionLabel>
              <div className="grid grid-cols-6 gap-2 lg:grid-cols-3">
                {Array.from({ length: BADGE_SLOTS }, (_, i) => (
                  <div key={i} className="aspect-square rounded-lg border border-dashed border-line-strong bg-bg" />
                ))}
              </div>
              <p className="text-xs text-muted">{t('home.badges.body')}</p>
            </Card>

            <div className="rounded-lg border-l-4 border-bad bg-surface p-4">
              <h2 className="font-bold">{t('home.help.title')}</h2>
              <p className="text-sm text-ink-soft">{t('home.help.body')}</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs font-bold tracking-wide text-muted uppercase">{label}</p>
    </Card>
  );
}
