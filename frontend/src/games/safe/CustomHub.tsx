/**
 * Scenarios the class facilitator made. They arrive by sync, play in the same
 * room as the built-in Scam Inbox, and count towards points and stars like any
 * other room.
 *   /safe/custom            the list
 *   /safe/custom/:id        play one
 * Owner: P5.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { listCustomScenarios, loadActiveProfile, logResult, registerStrings, t, useActiveProfile, type CustomScenarioRow } from '@/platform';
import type { MiniGameResult } from '@/core/types';
import { Badge, Button, Card, Icon, SectionLabel, Spinner } from '@/ui';
import { BackLink, LEVEL, Stars, useProgress } from './hubShared';
import { applyRun, scoreOf, type Gain, type Progress } from './logic/progress';
import { loadProgress, saveProgress } from './progressStore';
import { buildCustomInbox } from './phone/logic/custom';
import { shuffleChoices } from './phone/logic/shuffle';
import type { RunMeta } from './phone/logic/scoring';
import { PhoneRoom } from './phone/PhoneRoom';
import { RewardScreen } from './RewardScreen';

/** The facilitator's published scenarios for the signed-in student's class. */
export function useCustomScenarios(): { rows: CustomScenarioRow[]; loaded: boolean } {
  const profile = useActiveProfile((s) => s.profile);
  const profileLoaded = useActiveProfile((s) => s.loaded);
  const [state, setState] = useState<{ rows: CustomScenarioRow[]; loaded: boolean }>({ rows: [], loaded: false });

  useEffect(() => {
    if (!profileLoaded) void loadActiveProfile();
  }, [profileLoaded]);

  const classCode = profile?.classCode ?? null;
  useEffect(() => {
    if (!profileLoaded) return;
    let cancelled = false;
    void listCustomScenarios(classCode).then((rows) => {
      if (!cancelled) setState({ rows, loaded: true });
    });
    return () => {
      cancelled = true;
    };
  }, [classCode, profileLoaded]);

  return state;
}

const entryIdOf = (row: CustomScenarioRow) => `custom_${row.id}`;

/** The card on the Stay Safe home. Shows only when the facilitator has published something. */
export function CustomCard() {
  const { rows } = useCustomScenarios();
  const progress = useProgress();
  if (rows.length === 0) return null;
  const fresh = rows.filter((r) => !progress.entries[entryIdOf(r)]).length;
  return (
    <Link to="/safe/custom" className="flex items-center gap-4 rounded-xl border-2 border-info bg-info/10 p-5 transition hover:bg-info/20">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/20 text-info"><Icon name="users" className="h-6 w-6" /></span>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-info">{t('safe.hub.custom.title')}</p>
        <p className="mt-0.5 text-lg font-bold text-ink">{t('safe.hub.custom.count', { n: rows.length })}</p>
        <p className="text-sm text-ink-soft">{t('safe.hub.custom.blurb')}</p>
      </div>
      {fresh > 0 && <Badge tone="info">{t('safe.hub.custom.new', { n: fresh })}</Badge>}
      <Icon name="arrowRight" className="h-6 w-6 text-info" />
    </Link>
  );
}

export function CustomHub({ entryId }: { entryId?: string }) {
  const { rows, loaded } = useCustomScenarios();
  if (!loaded) return <Spinner />;
  const row = entryId ? rows.find((r) => r.id === entryId) : undefined;
  if (entryId && !row) return <Navigate to="/safe/custom" replace />;
  return row ? <PlayCustom row={row} /> : <CustomList rows={rows} />;
}

function CustomList({ rows }: { rows: CustomScenarioRow[] }) {
  const progress = useProgress();
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 lg:p-8">
      <div>
        <BackLink to="/safe" label={t('safe.hub.back')} />
        <h1 className="mt-3 text-3xl font-bold text-ink">{t('safe.hub.custom.title')}</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">{t('safe.hub.custom.blurb')}</p>
      </div>
      {rows.length === 0 && <Card className="text-ink-soft">{t('safe.hub.custom.none')}</Card>}
      <SectionLabel>{t('safe.hub.modes')}</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => {
          const p = progress.entries[entryIdOf(r)];
          return (
            <Card key={r.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{t('safe.hub.custom.badge')}</Badge>
                <Badge tone="warn">{LEVEL[2]}</Badge>
                {p && <Badge tone="good">{t('safe.hub.completed')}</Badge>}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-ink">{r.title}</h2>
                <p className="mt-1 text-sm text-muted">{r.brief}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                {p ? <Stars n={p.stars} /> : <span>{t('safe.hub.notStarted')}</span>}
                <span>{r.body.messages.length} {t('safe.hub.custom.messages')}</span>
              </div>
              <Link to={`/safe/custom/${r.id}`}>
                <Button className="w-full">{p ? t('safe.reward.replay') : t('safe.ui.playRoom')}</Button>
              </Link>
            </Card>
          );
        })}
      </div>
    </main>
  );
}

type Done = { gain: Gain; progress: Progress };

function PlayCustom({ row }: { row: CustomScenarioRow }) {
  const navigate = useNavigate();
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000) + 1);
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<Done | null>(null);
  const saved = useProgress();

  // The facilitator's own text is registered under the keys the script uses.
  const script = useMemo(() => {
    const { scenario, strings } = buildCustomInbox(row);
    registerStrings('en', strings);
    return shuffleChoices(scenario, seed + attempt);
  }, [row, seed, attempt]);

  const finish = async (result: MiniGameResult, meta: RunMeta) => {
    void logResult(result, { activity: 'UC-CUSTOM', concept: row.concept });
    const applied = applyRun(await loadProgress(), {
      entryId: entryIdOf(row),
      simulatorId: 'custom',
      level: 2,
      score: scoreOf(result, meta.fooled),
      fooled: meta.fooled,
      kinds: meta.kinds,
      catalogue: {},
      now: Date.now(),
    });
    await saveProgress(applied.progress);
    setDone(applied);
  };

  if (done) {
    return (
      <RewardScreen
        entryTitle={row.title}
        gain={done.gain}
        progress={done.progress}
        backLabel={t('safe.reward.back', { name: t('safe.hub.custom.title') })}
        onNext={() => undefined}
        onReplay={() => {
          setDone(null);
          setAttempt((n) => n + 1);
        }}
        onBack={() => navigate('/safe/custom')}
      />
    );
  }
  return <PhoneRoom key={attempt} script={script} mode="arcade" collected={saved.cards} onComplete={(r, m) => void finish(r, m)} />;
}
