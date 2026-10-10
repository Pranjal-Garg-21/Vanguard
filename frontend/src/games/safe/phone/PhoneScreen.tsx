/**
 * The live phone: home screen, app lists, surface view, notification banner
 * and the overlays (calls, permission dialogs). It reads the run state and
 * sends actions back; all the rules live in logic/runner.
 */
import { useEffect, useRef, useState } from 'react';
import { t } from '@/platform';
import { Button } from '@/ui';
import { IncomingCall } from './apps/CallScreen';
import { PayHome } from './apps/PayApp';
import { PermissionDialog } from './apps/PermissionDialog';
import { bankBalance, isOverlay, surfaceOf } from './logic/runner';
import type { RunAction, RunState, Surface } from './logic/types';
import { judgeFeedback, responseFeedback } from './logic/feedback';
import { FeedbackCard } from './FeedbackCard';
import { Icon, type IconName } from './Icon';
import { buzz } from './usePhoneRun';
import { formatClock, PhoneShell } from './PhoneShell';
import { APP_OF, SurfaceBody, surfacePreview, surfaceTitle } from './SurfaceView';
import { LensReading, type ViewProps } from './Text';
import { TellList } from './TellList';

type AppId = 'messages' | 'chat' | 'mail' | 'phone' | 'pay';

const APPS: { id: AppId; icon: IconName; nameKey: string; tint: string }[] = [
  { id: 'messages', icon: 'message', nameKey: 'Messages', tint: 'bg-emerald-600' },
  { id: 'chat', icon: 'chat', nameKey: 'Chat', tint: 'bg-sky-500' },
  { id: 'mail', icon: 'mail', nameKey: 'Mail', tint: 'bg-amber-500' },
  { id: 'pay', icon: 'wallet', nameKey: 'Pay', tint: 'bg-indigo-500' },
  { id: 'phone', icon: 'phone', nameKey: 'Phone', tint: 'bg-rose-500' },
];

const VERDICTS = ['legit', 'suspicious', 'scam'] as const;

type Props = {
  state: RunState;
  dispatch: (a: RunAction) => void;
  lensOn: boolean;
  onToggleLens: () => void;
  compact?: boolean;
  /** Called when the student is ready to leave a finished run. */
  onFinish?: () => void;
};

export function PhoneScreen({ state, dispatch, lensOn, onToggleLens, compact, onFinish }: Props) {
  const [app, setApp] = useState<AppId | 'home'>('home');
  const [reading, setReading] = useState<{ surface: string; lens: string } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const seen = useRef(0);
  const { script } = state;
  const isAct = script.mode === 'act';

  // New arrivals: a banner slides in and the phone buzzes.
  useEffect(() => {
    if (state.inbox.length <= seen.current) return;
    const id = state.inbox[state.inbox.length - 1] as string;
    seen.current = state.inbox.length;
    const s = surfaceOf(script, id);
    if (!s || state.open === id) return;
    buzz(s.type === 'call' ? [300, 150, 300] : 120);
    setBanner(id);
    const timer = window.setTimeout(() => setBanner((b) => (b === id ? null : b)), 5000);
    return () => window.clearTimeout(timer);
  }, [state.inbox, state.open, script]);

  const openSurface = (id: string) => {
    const s = surfaceOf(script, id);
    if (s) setApp(APP_OF[s.type] === 'browser' || APP_OF[s.type] === 'system' ? 'home' : (APP_OF[s.type] as AppId));
    dispatch({ type: 'open', surface: id });
    setBanner(null);
  };

  const top = state.open ? surfaceOf(script, state.open) : undefined;
  const overlay = top && isOverlay(script, top) ? top : undefined;
  // Behind a call or permission dialog, keep showing what was open before.
  const baseId = overlay ? state.underlay : state.open;
  const open = baseId ? surfaceOf(script, baseId) : undefined;

  const view = (id: string, surface: Surface): ViewProps => {
    const timeout = surface.timeout;
    return {
      lensOn,
      inspected: state.inspected.filter((k) => k.startsWith(`${id}:`)).map((k) => k.slice(id.length + 1)),
      onInspect: (lens) => {
        dispatch({ type: 'inspect', surface: id, lens });
        setReading({ surface: id, lens });
      },
      onAct: (action) => dispatch({ type: 'act', surface: id, action }),
      resolved: state.acted[id] ?? (state.moved.includes(id) ? 'moved' : undefined),
      timersOff: state.timersOff,
      vars: script.vars,
      remainingMs: timeout ? Math.max(0, timeout.ms - (state.now - (state.deliveredAt[id] ?? 0))) : undefined,
    };
  };

  const unread = (a: AppId) => state.inbox.filter((id) => !state.read.includes(id) && APP_OF[surfaceOf(script, id)?.type ?? 'sms'] === (a === 'phone' ? 'phone' : a)).length;
  const inApp = (a: AppId) => state.inbox.filter((id) => APP_OF[surfaceOf(script, id)?.type ?? 'sms'] === a);

  /** Earlier messages of the same conversation, with the student's replies. */
  const earlierFor = (id: string, surface: Surface) => {
    if (surface.type !== 'chat' || !surface.thread) return undefined;
    const out: { surface: Extract<Surface, { type: 'chat' }>; said?: string }[] = [];
    for (const other of state.inbox) {
      if (other === id) break;
      const sf = surfaceOf(script, other);
      if (sf?.type !== 'chat' || sf.thread !== surface.thread) continue;
      const lastAct = [...state.history].reverse().find((h) => h.kind === 'acted' && h.surface === other);
      const said = lastAct && lastAct.kind === 'acted' ? sf.actions?.find((a) => a.id === lastAct.action)?.say : undefined;
      out.push({ surface: sf, said });
    }
    return out;
  };

  /** Inbox ids for an app. A conversation shows once, at its latest message. */
  const listIds = (a: AppId) => {
    const ids = inApp(a);
    return ids.filter((id) => {
      const sf = surfaceOf(script, id);
      if (sf?.type !== 'chat' || !sf.thread) return true;
      return !ids.some((later) => later !== id && ids.indexOf(later) > ids.indexOf(id) && (surfaceOf(script, later) as Surface & { thread?: string }).thread === sf.thread);
    });
  };

  /** What the student chose on a screen, whether it was right, and why. */
  const feedbackNode = (id: string, surface: Surface, dark = false): React.ReactNode => {
    const lastAct = [...state.history].reverse().find((h) => h.kind === 'acted' && h.surface === id);
    if (!lastAct || lastAct.kind !== 'acted') return null;
    const chosen = surface.actions?.find((a) => a.id === lastAct.action);
    const fb = responseFeedback(surface, lastAct.action);
    if (fb && chosen) {
      const better = fb.best ? surface.actions?.find((a) => a.id === fb.best) : undefined;
      return (
        <div className="mt-4 space-y-3">
          <FeedbackCard feedback={fb} yours={t(chosen.labelKey)} bestLabel={better ? t(better.labelKey) : undefined} vars={script.vars} tone={dark ? 'dark' : 'phone'} />
          {state.acted[id] && (surface.tells?.length ?? 0) > 0 && <TellList state={state} surfaceId={id} tone={dark ? 'dark' : 'phone'} />}
        </div>
      );
    }
    if (!state.acted[id]) return null;
    return <p className="mt-3 text-xs text-phone-muted">{lastAct.auto ? t('safe.ui.auto') : t('safe.ui.youDid', { what: t(chosen?.labelKey ?? '') })}</p>;
  };

  // The student decides when to move on, so there is time to read the feedback.
  const finishLabel = script.mode === 'judge' ? t('safe.ui.seeResults') : t('safe.ui.seeWhatHappened');
  const continueButton = (id: string): React.ReactNode => {
    if (state.reading === id) return <Button className="mt-4 w-full" onClick={() => dispatch({ type: 'continue' })}>{t('safe.ui.continue')}</Button>;
    if (state.ended && onFinish && state.open === id) return <Button className="mt-4 w-full" onClick={onFinish}>{finishLabel}</Button>;
    return null;
  };

  let content: React.ReactNode;
  if (state.ended && !open && onFinish) {
    content = (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-phone-ink">
        <p className="text-lg font-bold">{t('safe.ui.finished')}</p>
        <Button onClick={onFinish}>{finishLabel}</Button>
      </div>
    );
  } else if (open) {
    const id = baseId as string;
    const v = view(id, open);
    const verdict = state.verdicts[id];
    content = (
      <div className="pb-6">
        <SurfaceBody
          surface={open}
          view={v}
          earlier={earlierFor(id, open)}
          saidNow={(() => {
            const last = [...state.history].reverse().find((h) => h.kind === 'acted' && h.surface === id);
            return last && last.kind === 'acted' ? open.actions?.find((a) => a.id === last.action)?.say : undefined;
          })()}
          typing={open.type === 'chat' && !!open.thread && state.pending.some((p) => {
            const sf = surfaceOf(script, p.step);
            return sf?.type === 'chat' && sf.thread === open.thread;
          })}
        />
        <div className="px-4">
          {!lensOn && state.inspected.length === 0 && state.read.length <= 1 && <p className="mb-3 flex items-start gap-2 rounded-lg bg-phone-link/10 p-2.5 text-xs text-phone-ink"><Icon name="search" className="mt-0.5 h-4 w-4 text-phone-link" />{t('safe.ui.lensHint')}</p>}
          {lensOn && <p className="mb-2 text-xs font-bold text-phone-link">{t('safe.ui.lensOn')}</p>}
          <LensReading surface={open} lensId={reading?.surface === id ? reading.lens : null} vars={script.vars} />

          {script.mode === 'judge' && !verdict && !state.ended && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold">{t('safe.ui.verdictQ')}</p>
              <div className="grid grid-cols-3 gap-2">
                {VERDICTS.map((vd) => (
                  <button key={vd} type="button" onClick={() => dispatch({ type: 'judge', surface: id, verdict: vd })} className="min-h-12 rounded-lg border border-phone-line bg-phone-card px-1 text-sm font-bold text-phone-ink shadow-sm active:translate-y-px">
                    {t(`safe.verdict.${vd}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {script.mode === 'judge' && verdict && open.verdict && (
            <div className="mt-5 space-y-3">
              {(() => {
                const fb = judgeFeedback(open, verdict);
                return <FeedbackCard feedback={fb} yours={t(`safe.verdict.${verdict}`)} bestLabel={fb.best ? t(`safe.verdict.${fb.best}`) : undefined} vars={script.vars} />;
              })()}
              <TellList state={state} surfaceId={id} tone="phone" />
              {continueButton(id)}
            </div>
          )}

          {isAct && !state.ended && open.actions && open.type !== 'search' && (
            <div className="mt-5 grid gap-2">
              {open.actions.filter((a) => a.id !== open.timeout?.action).map((a) => (
                <Button
                  key={a.id}
                  variant="secondary"
                  className="!border-phone-line !bg-phone-card !text-phone-ink shadow-sm"
                  disabled={!!state.acted[id] || state.moved.includes(id) || state.history.some((h) => h.kind === 'acted' && h.surface === id && h.action === a.id)}
                  onClick={() => dispatch({ type: 'act', surface: id, action: a.id })}
                >
                  {t(a.labelKey)}
                </Button>
              ))}
            </div>
          )}
          {isAct && feedbackNode(id, open)}
          {continueButton(id)}
        </div>
      </div>
    );
  } else if (app === 'home') {
    content = (
      <div className="p-5">
        <div className="grid grid-cols-3 gap-x-4 gap-y-6 pt-4">
          {APPS.map((a) => (
            <button key={a.id} type="button" onClick={() => setApp(a.id)} className="relative flex flex-col items-center gap-1.5 text-xs font-medium text-phone-ink">
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow ${a.tint}`}><Icon name={a.icon} className="h-7 w-7" /></span>
              {a.nameKey}
              {unread(a.id) > 0 && <span className="absolute -right-0.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-bad px-1 text-[11px] font-bold text-white">{unread(a.id)}</span>}
            </button>
          ))}
        </div>
        <p className="mt-10 text-center text-[11px] text-phone-muted">{t('safe.ui.simulated')}</p>
      </div>
    );
  } else if (app === 'pay') {
    const requests = inApp('pay').map((id) => ({ id, label: surfacePreview(surfaceOf(script, id) as Surface, script.vars) + ' · ' + surfaceTitle(surfaceOf(script, id) as Surface) }));
    content = <PayHome balance={bankBalance(state)} lost={-(state.effects['money.bank'] ?? 0)} requests={requests} onOpen={openSurface} />;
  } else {
    const ids = listIds(app);
    content = (
      <div>
        <h2 className="px-4 pb-1 pt-4 text-xl font-bold text-phone-ink">{APPS.find((a) => a.id === app)?.nameKey}</h2>
        {ids.length === 0 && <p className="p-4 text-sm text-phone-muted">{t('safe.ui.noMessages')}</p>}
        {ids.map((id) => {
          const s = surfaceOf(script, id) as Surface;
          const verdict = state.verdicts[id];
          return (
            <button key={id} type="button" onClick={() => openSurface(id)} className="flex w-full items-start gap-3 border-b border-phone-line px-4 py-3 text-left">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${state.read.includes(id) ? 'bg-transparent' : 'bg-phone-link'}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-phone-ink">{surfaceTitle(s)}</span>
                <span className="block truncate text-sm text-phone-muted">{surfacePreview(s, script.vars)}</span>
              </span>
              {verdict && <span className="mt-0.5 rounded bg-phone-bubble px-1.5 py-0.5 text-[10px] font-bold uppercase text-phone-ink">{t(`safe.verdict.${verdict}`)}</span>}
              {s.respond && (
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${state.acted[id] ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                  {state.acted[id] ? t('safe.ui.answered') : t('safe.ui.needsReply')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  const bannerSurface = banner ? surfaceOf(script, banner) : undefined;
  const bannerNode = bannerSurface && (
    <button type="button" onClick={() => openSurface(banner as string)} className="mx-2 mt-1 flex min-w-0 animate-banner-in items-start gap-2 rounded-xl border border-phone-line bg-phone-card p-3 text-left shadow-lg">
      <Icon name={bannerSurface.type === 'call' ? 'phone' : 'bell'} className="mt-0.5 h-5 w-5 text-phone-link" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-phone-ink">{surfaceTitle(bannerSurface)}</span>
        <span className="block truncate text-xs text-phone-muted">{surfacePreview(bannerSurface, script.vars)}</span>
      </span>
    </button>
  );

  // An overlay (a call or a permission prompt) shows its feedback and a Continue button once answered.
  const overlayReview = !!overlay && (state.reading === state.open || state.ended) && !!state.history.some((h) => h.kind === 'acted' && h.surface === state.open);
  const overlayContinue = state.reading === state.open ? () => dispatch({ type: 'continue' }) : onFinish;
  const overlayLabel = state.reading === state.open ? t('safe.ui.continue') : finishLabel;
  const canBack = !overlay && (!!state.open || app !== 'home');
  return (
    <PhoneShell
      clock={formatClock(script.phone.startTime, state.now, script.phone.clockRate)}
      lensOn={lensOn}
      onToggleLens={onToggleLens}
      onBack={canBack ? () => (state.open ? dispatch({ type: 'close' }) : setApp('home')) : undefined}
      onHome={canBack ? () => { dispatch({ type: 'close' }); setApp('home'); } : undefined}
      banner={bannerNode}
      compact={compact}
      scrollKey={`${baseId ?? app}`}
    >
      {content}
      {overlay?.type === 'call' && (
        <IncomingCall
          surface={overlay}
          view={view(state.open as string, overlay)}
          actions={overlay.actions ?? []}
          lensNode={reading?.surface === state.open ? <LensReading surface={overlay} lensId={reading.lens} vars={script.vars} /> : undefined}
          onAct={(a) => dispatch({ type: 'act', surface: state.open as string, action: a })}
          after={overlayReview ? feedbackNode(state.open as string, overlay, true) : undefined}
          onContinue={overlayContinue}
          continueLabel={overlayLabel}
        />
      )}
      {overlay?.type === 'permission' && (
        <PermissionDialog
          appKey={overlay.appKey}
          askKey={overlay.askKey}
          actions={overlay.actions ?? []}
          onAct={(a) => dispatch({ type: 'act', surface: state.open as string, action: a })}
          after={overlayReview ? feedbackNode(state.open as string, overlay) : undefined}
          onContinue={overlayContinue}
          continueLabel={overlayLabel}
        />
      )}
    </PhoneShell>
  );
}
