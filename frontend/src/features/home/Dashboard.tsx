/**
 * Student dashboard, laid out like TryHackMe's: top bar with streak and XP,
 * a "continue learning" card, the learning path, practice rooms, and a side
 * rail with the daily challenge and badges. Owner: P2 (placeholder content
 * until LifePath, Arcade and Progress land).
 */
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import {
  loadActiveProfile,
  recentEvents,
  dismissNewUnlocks,
  refreshSyncStatus,
  switchPlayer,
  t,
  useActiveProfile,
  useSyncStatus,
  type GameEvent,
} from '@/platform';
import { ARCADE_SECTIONS, STAGES } from '@/content/stages';
import { Avatar } from '@/features/setup';
import { Badge, Button, Card, Icon, Notice, SectionLabel, Spinner, TopNav } from '@/ui';
import { summariseEvents } from './stats';
import { BadgesCard } from './BadgesCard';
import { HomeHub } from './HomeHub';
import { SECTION_ROUTES } from './sections';


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
  const opened: string[] = [];
  for (const target of sync.newUnlocks) {
    const name = STAGES.find((s) => s.id === target)?.name ?? ARCADE_SECTIONS.find((a) => a.id === target)?.name;
    if (name) opened.push(name);
  }
  const syncLabel = sync.state === 'pending' ? t('home.sync.pending', { count: sync.pending }) : t(`home.sync.${sync.state}`);

  return (
    <div className="min-h-dvh">
      <TopNav>
            <span title={t('home.stats.streak')} className="inline-flex items-center gap-1">
              <Icon name="flame" className="h-4 w-4 text-warn" />
              <span className="text-brand">{stats.streak}</span> <span className="text-muted">d</span>
            </span>
            <span title={t('home.stats.xp')} className="inline-flex items-center gap-1">
              <Icon name="zap" className="h-4 w-4 text-xp" />
              <span className="text-brand">{stats.xp}</span> <span className="text-muted">{t('home.stats.xp')}</span>
            </span>
            <button
              type="button"
              aria-label={t('home.switchPlayer')}
              title={t('home.switchPlayer')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface-2 hover:border-brand"
              onClick={async () => {
                await switchPlayer();
                navigate('/who');
              }}
            >
              <Avatar id={profile.avatarId} className="h-9 w-9" iconClassName="h-5 w-5" />
            </button>
          </TopNav>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{t('home.greeting', { name: profile.displayName })}</h1>
          <Badge variant={sync.state === 'synced' ? 'good' : sync.state === 'error' ? 'bad' : 'neutral'}>{syncLabel}</Badge>
        </div>

        {opened.length > 0 && (
          <Notice tone="info">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">{t('home.newUnlock', { names: opened.join(', ') })}</span>
              <button type="button" className="text-sm font-bold text-brand" onClick={dismissNewUnlocks}>{t('home.dismiss')}</button>
            </div>
          </Notice>
        )}

        <div className="grid animate-rise grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={t('home.stats.streak')} value={stats.streak} />
          <Stat label={t('home.stats.xp')} value={stats.xp} />
          <Stat label={t('home.stats.answers')} value={stats.answers} />
          <Stat label={t('home.stats.concepts')} value={stats.concepts} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="animate-rise space-y-6 [animation-delay:80ms]">
            <HomeHub pid={profile.pid} />

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
                    <Badge variant={i === 0 ? 'good' : 'neutral'}>{i === 0 ? t('home.soon') : t('home.locked')}</Badge>
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-3">
              <SectionLabel>{t('home.practiceTitle')}</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-3">
                {ARCADE_SECTIONS.map((a) => {
                  const to = SECTION_ROUTES[a.id];
                  const body = (
                    <>
                      <Badge>{a.level}</Badge>
                      <h3 className="font-bold">{a.name}</h3>
                      <p className="flex-1 text-sm text-muted">{a.blurb}</p>
                      <span className={`text-xs font-bold uppercase ${to ? 'text-brand' : 'text-muted'}`}>{to ? t('home.play') : t('home.soon')}</span>
                    </>
                  );
                  return to ? (
                    <Link key={a.id} to={to} className="flex flex-col gap-2 rounded-xl border border-line-strong bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10">
                      {body}
                    </Link>
                  ) : (
                    <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
                      {body}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="animate-rise space-y-6 [animation-delay:160ms]">
            <Card className="space-y-3">
              <SectionLabel>{t('home.daily.title')}</SectionLabel>
              <p className="text-sm text-ink-soft">{t('home.daily.body')}</p>
              <Button variant="secondary" className="w-full" disabled>
                {t('home.soon')}
              </Button>
            </Card>

            <BadgesCard pid={profile.pid} />

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
    <Card className="p-4 transition duration-200 hover:border-brand/60">
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-bold tracking-wide text-muted uppercase">{label}</p>
    </Card>
  );
}
