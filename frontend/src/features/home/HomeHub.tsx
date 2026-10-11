/**
 * The three doors at the top of the dashboard. Owner: P3.
 *
 * Paisapur is the big one because it is the spine of the product: a year of a
 * character's money life. Lessons and Stay Safe sit beside it as their own
 * smaller doors, because neither is part of that story — a student can take
 * the investing rooms or the scam simulators without having played a month.
 *
 * The big card reads the student's actual save, so "Continue" means continue.
 * With nothing saved it says so and starts a new year instead of pretending
 * there is progress to resume.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { getSetting, loadGame, rupees, t } from '@/platform';
import { Button, Card, Icon, SectionLabel, TileMap, LANDING_SCENE, VILLAGE_LEGEND, type IconName } from '@/ui';
import { SIMULATORS } from '@/games/safe/catalog';
import { rooms } from '@/games/investing/lessons/logic/content';

/** The part of Paisapur's save this card needs. Its shape is owned by P2. */
type PaisapurSave = {
  life?: { chapter?: number; month?: number; cash?: number; bank?: { balance?: number } };
};

const SLOT = 'paisapur';
const CHAPTERS = 6;

type Progress = { chapter: number; month: number; money: number } | null;

export function HomeHub({ pid }: { pid: string }) {
  const [progress, setProgress] = useState<Progress>(null);
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();

  /** The starting-point questions are asked once, the first time the student begins, not before they have chosen to play. */
  async function play() {
    // Fullscreen has to be asked for inside the tap; the game leaves it again when it closes.
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    const baseline = await getSetting(pid, 'baseline');
    if (baseline || started) navigate('/play');
    else navigate('/onboarding', { state: { next: '/play' } });
  }

  useEffect(() => {
    let live = true;
    void loadGame<PaisapurSave>(pid, SLOT).then((save) => {
      if (!live) return;
      const life = save?.life;
      if (life && typeof life.chapter === 'number') {
        setProgress({ chapter: life.chapter, month: life.month ?? 0, money: (life.cash ?? 0) + (life.bank?.balance ?? 0) });
      }
      setChecked(true);
    });
    return () => {
      live = false;
    };
  }, [pid]);

  const started = progress !== null;

  return (
    <section className="space-y-4">
      <SectionLabel>{t(started ? 'home.hub.continue' : 'home.hub.start')}</SectionLabel>

      <Card className="overflow-hidden !p-0">
        <div className="relative">
          {/* The town itself, so the card shows the game rather than describing it. */}
          <TileMap rows={LANDING_SCENE} legend={VILLAGE_LEGEND} className="max-h-56 opacity-90" label={t('landing.sceneLabel')} />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent" />
        </div>

        <div className="-mt-16 relative space-y-3 p-5">
          <h2 className="text-2xl font-bold">{t('home.lifepath.title')}</h2>
          <p className="max-w-prose text-sm text-ink-soft">{t('home.lifepath.body')}</p>

          {started && progress && (
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted">{t('home.hub.chapter')}</dt>
                <dd className="font-bold tabular-nums">
                  {progress.chapter} / {CHAPTERS}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">{t('home.hub.month')}</dt>
                <dd className="font-bold tabular-nums">{progress.month + 1}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">{t('home.hub.money')}</dt>
                <dd className="font-bold tabular-nums">{rupees(progress.money)}</dd>
              </div>
            </dl>
          )}

          <Button size="lg" className="w-full sm:w-auto" onClick={() => void play()}>
            {t(started ? 'home.hub.resume' : 'home.hub.begin')}
            <Icon name="arrowRight" className="h-5 w-5" />
          </Button>
          {checked && !started && <p className="text-xs text-muted">{t('home.hub.noSave')}</p>}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <SideDoor
          to="/learn"
          icon="book"
          title={t('home.hub.learn.title')}
          body={t('home.hub.learn.body')}
          count={t('home.hub.learn.count', { count: rooms.length })}
        />
        <SideDoor
          to="/safe"
          icon="shield"
          title={t('home.hub.safe.title')}
          body={t('home.hub.safe.body')}
          count={t('home.hub.safe.count', { count: SIMULATORS.length })}
        />
      </div>
    </section>
  );
}

function SideDoor({ to, icon, title, body, count }: { to: string; icon: IconName; title: string; body: string; count: string }) {
  return (
    <Link
      to={to}
      className="flex items-start gap-4 rounded-xl border border-line-strong bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{body}</span>
        <span className="mt-2 block text-xs font-bold uppercase tracking-wide text-brand">{count}</span>
      </span>
      <Icon name="chevronRight" className="mt-3 h-5 w-5 text-muted" />
    </Link>
  );
}
