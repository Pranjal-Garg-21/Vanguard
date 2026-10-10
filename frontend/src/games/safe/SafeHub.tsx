/**
 * Stay Safe hub. Three levels, each its own URL so the back button works:
 *   /safe                  your progress, the next room on your path, and the simulators
 *   /safe/:sim             the rooms in one simulator, with stars and XP
 *   /safe/:sim/:entry      play, then a reward screen
 * Finished runs are logged as events and saved as progress (XP, stars, rank,
 * badges, red-flag cards). Owner: P5.
 */
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { logResult, t } from '@/platform';
import type { MiniGameResult } from '@/core/types';
import { Badge, Button, Card, Icon, ProgressBar, SectionLabel } from '@/ui';
import { CATALOGUE, findEntry, getEntry, getSimulator, PATH, SIMULATORS, type CatalogEntry } from './catalog';
import { ALL_CARDS, applyRun, BADGES, BASE_XP, emptyProgress, nextOnPath, RANKS, rankProgress, scoreOf, type Gain, type Progress } from './logic/progress';
import { loadProgress, saveProgress } from './progressStore';
import { PhoneRoom } from './phone/PhoneRoom';
import { TellCard } from './phone/TellCard';
import type { RunMeta } from './phone/logic/scoring';
import { TELL_KINDS, type Scenario } from './phone/logic/types';
import { applyVariant } from './phone/logic/variants';
import { shuffleChoices } from './phone/logic/shuffle';
import { getScenario, inboxDay } from './phone/scenarios';
import { RewardScreen } from './RewardScreen';
import { TEMPLATES, UPI_TEMPLATES } from './specs';
import { UpiSimulator } from './upi-simulator';
import { collectRequestVariant, qrReceiveVariant } from './upi-simulator/logic/variants';

const LEVEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' } as const;

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">
      <Icon name="back" className="h-4 w-4" />
      {label}
    </Link>
  );
}

function useProgress() {
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  useEffect(() => {
    void loadProgress().then(setProgress);
  }, []);
  return progress;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={t('safe.reward.stars', { n })}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name="star" className={`h-4 w-4 ${i <= n ? 'fill-current text-warn' : 'text-surface-3'}`} />
      ))}
    </span>
  );
}

export function SafeHub() {
  const { sim: simId, entry: entryId } = useParams();
  if (!simId) return <Simulators />;
  const sim = getSimulator(simId);
  if (!sim || sim.entries.length === 0) return <Navigate to="/safe" replace />;
  const entry = entryId ? getEntry(sim, entryId) : undefined;
  if (entryId && !entry) return <Navigate to={`/safe/${sim.id}`} replace />;
  return entry ? <Play simId={sim.id} entry={entry} /> : <Modes simId={sim.id} />;
}

function Simulators() {
  const progress = useProgress();
  const rank = rankProgress(progress.xp);
  const nextId = nextOnPath(PATH, progress);
  const next = nextId ? findEntry(nextId) : undefined;
  const done = Object.keys(progress.entries).length;
  const total = SIMULATORS.reduce((n, s) => n + s.entries.length, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4 lg:p-8">
      <div>
        <BackLink to="/home" label={t('safe.ui.backHome')} />
        <h1 className="mt-3 text-3xl font-bold text-ink">{t('safe.hub.title')}</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">{t('safe.hub.sub')}</p>
      </div>

      <Card className="grid gap-5 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <SectionLabel>{t('safe.hub.level')}</SectionLabel>
          <p className="mt-1 text-2xl font-bold text-xp">{t(`safe.rank.${rank.rank}`)}</p>
          <p className="text-xs text-muted">{t('safe.hub.levelNote', { n: rank.level, total: RANKS.length })}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-xp" style={{ width: `${Math.round(rank.fraction * 100)}%` }} /></div>
          <p className="mt-1 text-xs text-muted">{rank.next ? t('safe.reward.toNext', { n: rank.toNext, rank: t(`safe.rank.${rank.next}`) }) : t('safe.reward.top')}</p>
        </div>
        {[
          [t('safe.hub.points'), String(progress.xp), t('safe.hub.pointsNote')],
          [t('safe.hub.roomsFinished'), `${done} of ${total}`, t('safe.hub.roomsNote')],
          [t('safe.hub.achievements'), `${progress.badges.length} of ${BADGES.length}`, t('safe.hub.achievementsNote')],
        ].map(([label, value, note]) => (
          <div key={label}>
            <SectionLabel>{label}</SectionLabel>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</p>
            <p className="text-xs text-muted">{note}</p>
          </div>
        ))}
      </Card>

      {next && (
        <Link to={`/safe/${next.sim.id}/${next.entry.id}`} className="flex items-center gap-4 rounded-xl border-2 border-brand bg-brand/10 p-5 transition hover:bg-brand/20">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('safe.hub.pathTitle')}</p>
            <p className="mt-1 text-xl font-bold text-ink">{t(next.entry.titleKey)}</p>
            <p className="mt-0.5 text-sm text-ink-soft">{t(next.entry.briefKey)}</p>
          </div>
          <Icon name="arrowRight" className="h-7 w-7 text-brand" />
        </Link>
      )}

      <section className="space-y-3">
        <SectionLabel>{t('safe.hub.choose')}</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          {SIMULATORS.map((s) => {
            const finished = s.entries.filter((e) => progress.entries[e.id]).length;
            const stars = s.entries.reduce((n, e) => n + (progress.entries[e.id]?.stars ?? 0), 0);
            return (
              <Link key={s.id} to={`/safe/${s.id}`} className="flex flex-col gap-4 rounded-xl border border-line-strong bg-surface p-5 transition hover:border-brand">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15 text-brand"><Icon name={s.icon} className="h-6 w-6" /></span>
                  <Badge tone={finished === s.entries.length ? 'good' : 'neutral'}>{finished}/{s.entries.length}</Badge>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-ink">{t(s.titleKey)}</h2>
                  <p className="mt-1 text-sm text-muted">{t(s.blurbKey)}</p>
                </div>
                <div>
                  <ProgressBar value={finished / s.entries.length} />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-bold text-brand">{t('safe.hub.entries', { n: s.entries.length })}<Icon name="arrowRight" className="h-4 w-4" /></span>
                    <span className="flex items-center gap-1 text-muted"><Icon name="star" className="h-3.5 w-3.5 fill-current text-warn" />{stars}/{s.entries.length * 3}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>{t('safe.hub.collection')}</SectionLabel>
        <p className="text-sm text-muted">{t('safe.hub.badges')}: {progress.badges.length} of {BADGES.length}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BADGES.map((b) => {
            const has = progress.badges.includes(b);
            return (
              <div key={b} className={`flex items-center gap-3 rounded-xl border p-3 ${has ? 'border-warn/50 bg-warn/10' : 'border-line bg-surface opacity-60'}`}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${has ? 'bg-warn/20 text-warn' : 'bg-surface-3 text-muted'}`}><Icon name={has ? 'star' : 'lock'} className={`h-5 w-5 ${has ? 'fill-current' : ''}`} /></span>
                <div>
                  <p className="text-sm font-bold text-ink">{t(`safe.badge.${b}.name`)}</p>
                  <p className="text-xs text-muted">{t(`safe.badge.${b}.desc`)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="pt-2 text-sm text-muted">{t('safe.hub.cards')}: {progress.cards.length} of {ALL_CARDS}</p>
        <p className="text-xs text-muted">{t('safe.hub.cardsHint')}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TELL_KINDS.map((k) => <TellCard key={k} kind={k} found={false} collected={progress.cards.includes(k)} />)}
        </div>
      </section>
    </main>
  );
}

function Modes({ simId }: { simId: string }) {
  const sim = getSimulator(simId)!;
  const progress = useProgress();
  const nextId = nextOnPath(PATH, progress);
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 lg:p-8">
      <div>
        <BackLink to="/safe" label={t('safe.hub.back')} />
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15 text-brand"><Icon name={sim.icon} className="h-6 w-6" /></span>
          <h1 className="text-3xl font-bold text-ink">{t(sim.titleKey)}</h1>
        </div>
        <p className="mt-2 max-w-2xl text-ink-soft">{t(sim.blurbKey)}</p>
      </div>
      <SectionLabel>{t('safe.hub.modes')}</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        {sim.entries.map((e) => {
          const p = progress.entries[e.id];
          return (
            <Card key={e.id} className={`flex flex-col gap-3 ${nextId === e.id ? 'border-brand' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={e.level === 1 ? 'good' : e.level === 2 ? 'warn' : 'bad'}>{LEVEL[e.level]}</Badge>
                <Badge>{t(`safe.hub.${e.tag}`)}</Badge>
                {nextId === e.id && <Badge tone="info">{t('safe.hub.recommended')}</Badge>}
                {p && <Badge tone="good">{t('safe.hub.completed')}</Badge>}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-ink">{t(e.titleKey)}</h2>
                <p className="mt-1 text-sm text-muted">{t(e.briefKey)}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                {p ? <Stars n={p.stars} /> : <span>{t('safe.hub.notStarted')}</span>}
                <span>{p ? t('safe.hub.best', { n: Math.round(p.best * 100) }) : t('safe.hub.upTo', { n: BASE_XP[e.level] + 30 })}</span>
              </div>
              <Link to={`/safe/${sim.id}/${e.id}`}>
                <Button className="w-full">{p ? t('safe.reward.replay') : t('safe.ui.playRoom')}</Button>
              </Link>
            </Card>
          );
        })}
      </div>
    </main>
  );
}

/** A fresh seed per visit, so each play has different names and messages. */
function useSeed() {
  return useState(() => Math.floor(Math.random() * 1_000_000) + 1)[0];
}

function scriptFor(entry: CatalogEntry, seed: number): Scenario | undefined {
  switch (entry.kind) {
    case 'collect':
      return collectRequestVariant(UPI_TEMPLATES.collect, seed, 3400);
    case 'qr':
      return qrReceiveVariant(UPI_TEMPLATES.qr, seed, 3400);
    case 'inbox-day':
      return inboxDay({ seed, count: 6, level: entry.level });
    case 'template': {
      const tpl = entry.scenarioId ? TEMPLATES[entry.scenarioId] : undefined;
      return tpl ? applyVariant(tpl.template, seed, tpl.spec, tpl.balance) : undefined;
    }
    case 'scenario':
      return entry.scenarioId ? getScenario(entry.scenarioId) : undefined;
    default:
      return undefined;
  }
}

type Done = { gain: Gain; progress: Progress };

function Play({ simId, entry }: { simId: string; entry: CatalogEntry }) {
  const navigate = useNavigate();
  const seed = useSeed();
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<Done | null>(null);
  const saved = useProgress();

  const finish = async (result: MiniGameResult, meta: RunMeta) => {
    void logResult(result, { activity: entry.activity, concept: entry.concept });
    const prev = await loadProgress();
    const applied = applyRun(prev, {
      entryId: entry.id,
      simulatorId: simId,
      level: entry.level,
      score: scoreOf(result, meta.fooled),
      fooled: meta.fooled,
      kinds: meta.kinds,
      catalogue: CATALOGUE,
      now: Date.now(),
    });
    await saveProgress(applied.progress);
    setDone(applied);
  };

  if (done) {
    const nextId = nextOnPath(PATH, done.progress);
    const next = nextId ? findEntry(nextId) : undefined;
    return (
      <RewardScreen
        entryTitle={t(entry.titleKey)}
        gain={done.gain}
        progress={done.progress}
        next={next ? { title: t(next.entry.titleKey), brief: t(next.entry.briefKey) } : undefined}
        backLabel={t('safe.reward.back', { name: t(getSimulator(simId)?.titleKey ?? '') })}
        onNext={() => next && navigate(`/safe/${next.sim.id}/${next.entry.id}`)}
        onReplay={() => {
          setDone(null);
          setAttempt((n) => n + 1);
        }}
        onBack={() => navigate(`/safe/${simId}`)}
      />
    );
  }

  const playSeed = seed + attempt;
  if (entry.kind === 'upi-full') return <UpiSimulator key={attempt} seed={playSeed} mode="arcade" onComplete={(r, m) => void finish(r, m)} />;
  const built = scriptFor(entry, playSeed);
  if (!built) return <Navigate to={`/safe/${simId}`} replace />;
  // Shuffle the options so the right answer is not always in the same place.
  const script = shuffleChoices(built, playSeed);
  return <PhoneRoom key={attempt} script={script} mode="arcade" collected={saved.cards} onComplete={(r, m) => void finish(r, m)} />;
}
