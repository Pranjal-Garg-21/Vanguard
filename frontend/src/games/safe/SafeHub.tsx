/**
 * Stay Safe hub. Three levels, each its own URL so the back button works:
 *   /safe                  choose a simulator
 *   /safe/:sim             choose how to play it
 *   /safe/:sim/:entry      play
 * Finished runs are logged as events, so streak, XP and concepts on the
 * dashboard move. Owner: P5.
 */
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { logResult, t } from '@/platform';
import type { MiniGameResult } from '@/core/types';
import { Badge, Button, Card, SectionLabel } from '@/ui';
import { getEntry, getSimulator, SIMULATORS, type CatalogEntry } from './catalog';
import { Icon } from './phone/Icon';
import { PhoneRoom } from './phone/PhoneRoom';
import type { Scenario } from './phone/logic/types';
import { getScenario, inboxDay } from './phone/scenarios';
import collectTemplate from '../../content/scenarios/safe/templates/collect_request.json';
import qrTemplate from '../../content/scenarios/safe/templates/qr_receive.json';
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
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <div>
        <BackLink to="/home" label={t('safe.ui.backHome')} />
        <h1 className="mt-3 text-3xl font-bold text-ink">{t('safe.hub.title')}</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">{t('safe.hub.sub')}</p>
      </div>
      <SectionLabel>{t('safe.hub.choose')}</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        {SIMULATORS.map((s) => {
          const ready = s.entries.length > 0;
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${ready ? 'bg-brand/15 text-brand' : 'bg-surface-3 text-muted'}`}>
                  <Icon name={s.icon} className="h-6 w-6" />
                </span>
                <Badge tone={ready ? 'good' : 'neutral'}>{ready ? t('safe.hub.available') : t('safe.hub.soon')}</Badge>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-ink">{t(s.titleKey)}</h2>
                <p className="mt-1 text-sm text-muted">{t(s.blurbKey)}</p>
              </div>
              {ready && (
                <p className="flex items-center gap-1 text-sm font-bold text-brand">
                  {t('safe.hub.entries', { n: s.entries.length })}
                  <Icon name="arrowRight" className="h-4 w-4" />
                </p>
              )}
            </>
          );
          return ready ? (
            <Link key={s.id} to={`/safe/${s.id}`} className="flex flex-col gap-4 rounded-xl border border-line-strong bg-surface p-5 transition hover:border-brand">
              {body}
            </Link>
          ) : (
            <div key={s.id} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 opacity-70">
              {body}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Modes({ simId }: { simId: string }) {
  const sim = getSimulator(simId)!;
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
        {sim.entries.map((e) => (
          <Card key={e.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={e.level === 1 ? 'good' : 'warn'}>{LEVEL[e.level]}</Badge>
              <Badge>{t(`safe.hub.${e.tag}`)}</Badge>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-ink">{t(e.titleKey)}</h2>
              <p className="mt-1 text-sm text-muted">{t(e.briefKey)}</p>
            </div>
            <Link to={`/safe/${sim.id}/${e.id}`}>
              <Button className="w-full">{t('safe.ui.playRoom')}</Button>
            </Link>
          </Card>
        ))}
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
      return collectRequestVariant(collectTemplate as unknown as Scenario, seed, 3400);
    case 'qr':
      return qrReceiveVariant(qrTemplate as unknown as Scenario, seed, 3400);
    case 'inbox-day':
      return inboxDay({ seed, count: 6, level: entry.level });
    case 'scenario':
      return entry.scenarioId ? getScenario(entry.scenarioId) : undefined;
    default:
      return undefined;
  }
}

function Play({ simId, entry }: { simId: string; entry: CatalogEntry }) {
  const navigate = useNavigate();
  const seed = useSeed();
  const done = (result: MiniGameResult) => {
    void logResult(result, { activity: entry.activity, concept: entry.concept });
    navigate(`/safe/${simId}`);
  };
  if (entry.kind === 'upi-full') return <UpiSimulator seed={seed} mode="arcade" onComplete={done} />;
  const script = scriptFor(entry, seed);
  if (!script) return <Navigate to={`/safe/${simId}`} replace />;
  return <PhoneRoom script={script} mode="arcade" onComplete={done} />;
}
