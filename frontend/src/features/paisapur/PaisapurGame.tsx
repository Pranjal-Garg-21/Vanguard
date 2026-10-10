/**
 * Paisapur: the main game. A top-down RPG where the player walks the town,
 * talks to people and lives a year of money decisions. This component owns
 * the save, the walking loop and the overlays; the rules live in core/
 * (engine, world, story) and the content in content/.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { check, newLife, normalize, reduce, type Action, type LifeState } from '@/core/engine';
import { makeSeed } from '@/core/random';
import { evalCond, pendingAuto, runScript, type Host, type QuizResult } from '@/core/story';
import type { Level, MiniGameResult } from '@/core/types';
import { contextFromLife, getUiGame } from '@/games/adapter';
import { AUTOS, SCRIPTS, type Panel } from '@/core/story/content';
import { duelById } from '@/core/story/duel';
import { addCheckpoint, rewind, type Checkpoint, type OtherLife } from '@/core/timeline';
import { interact, isValidPos, step, type Dir, type Pos } from '@/core/world';
import { PAISAPUR, START_MAP } from '@/core/world/paisapur';
import { loadActiveProfile, loadGame, logEvent, saveGame, setTelemetryContext, t, useActiveProfile, type StageId } from '@/platform';
import { Spinner } from '@/ui';
import { rupees, storyVars } from './logic/format';
import {
  BankPanel,
  BondPanel,
  ExchangePanel,
  LoanPanel,
  NewsPanel,
  NightSummary,
  ShopPanel,
  YearPanel,
} from './panels';
import { StartMenu, type MenuScreen } from './menu';
import { audio } from './audio/engine';
import { trackForMap } from './audio/logic/score';
import { DuelScreen, RivalPanel, WhatIfPanel } from './extras';
import { draw, loadAssets, VIEW_H, VIEW_W, TILE, type Assets, type Walker } from './render';
import { KEY_A, KEY_MENU } from './input';
import { ChoiceBox, ConceptCard, Controls, DialogueBox, Hud, QuizPanel, Toasts, type Toast } from './ui';

const SLOT = 'paisapur';
const STEP_MS = 190;
const FADE_MS = 160;

type Save = { v: 1; life: LifeState; pos: Pos; checkpoints?: Checkpoint[]; other?: OtherLife | null };

type Overlay =
  | { kind: 'say'; text: string; who?: string }
  | { kind: 'choice'; options: string[]; prompt?: string; who?: string }
  | { kind: 'concept'; id: string }
  | { kind: 'quiz'; ids: string[] }
  | { kind: 'panel'; panel: Panel }
  | { kind: 'night'; before: LifeState }
  | { kind: 'menu'; screen: MenuScreen | null }
  | { kind: 'duel'; id: string }
  | { kind: 'minigame'; id: string; level: Level };

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
};

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function isSave(x: unknown): x is Save {
  return typeof x === 'object' && x !== null && (x as Save).v === 1 && typeof (x as Save).life === 'object' && isValidPos(PAISAPUR, (x as Save).pos);
}

/** True on screens wide enough to show dialogue inside the game view. */
function useWide(): boolean {
  const query = '(min-width: 768px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

function startPos(): Pos {
  const home = PAISAPUR.maps[START_MAP]!;
  return { map: START_MAP, x: 4, y: 4, facing: home.entry?.facing ?? 'down' };
}

export function PaisapurGame() {
  const navigate = useNavigate();
  const { profile, loaded } = useActiveProfile();
  const [life, setLife] = useState<LifeState | null>(null);
  const [mapId, setMapId] = useState(START_MAP);
  const [overlay, setOverlayState] = useState<Overlay | null>(null);
  /** Bumped for every new overlay, so each dialogue line remounts (restarting its typewriter). */
  const [overlaySeq, setOverlaySeq] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ready, setReady] = useState(false);
  const wide = useWide();

  const lifeRef = useRef<LifeState | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const resolver = useRef<((v: unknown) => void) | null>(null);
  const busy = useRef(false);
  const walker = useRef<Walker>({ pos: startPos(), from: null, t: 0, foot: 0 });
  const pendingStep = useRef<ReturnType<typeof step>['event'] | null>(null);
  const held = useRef<Dir[]>([]);
  const npcFacing = useRef<Record<string, Dir>>({});
  const fade = useRef(0);
  const assets = useRef<Assets | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepsSinceSave = useRef(0);
  const toastId = useRef(0);
  const lastBump = useRef(0);
  const checkpoints = useRef<Checkpoint[]>([]);
  const [other, setOther] = useState<OtherLife | null>(null);
  const otherRef = useRef<OtherLife | null>(null);
  /** The state when the current scene started (what a checkpoint saves). */
  const sceneStart = useRef<{ life: LifeState; pos: Pos; script: string } | null>(null);
  /** Work to do once the current scene has finished (rewinds, switching lives). */
  const afterScene = useRef<(() => Promise<void>) | null>(null);

  const pid = profile?.pid;
  const name = profile?.displayName ?? '';
  const reduceMotion =
    !!profile?.a11y.reduceMotion || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const setOverlay = (o: Overlay | null) => {
    overlayRef.current = o;
    setOverlayState(o);
    if (o) setOverlaySeq((n) => n + 1);
  };

  const cond = useCallback((expr: string) => (lifeRef.current ? evalCond(expr, lifeRef.current) : false), []);

  const vars = () => {
    const l = lifeRef.current!;
    return storyVars(l, name, t(`paisapur.goal.${l.goal.id}`));
  };

  const pushToast = (text: string, tone: Toast['tone']) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts.slice(-3), { id, text, tone }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 2600);
  };

  const commit = (next: LifeState) => {
    const before = lifeRef.current;
    lifeRef.current = next;
    setLife(next);
    if (!before) return;
    const money = (s: LifeState) => s.cash + s.bank.balance + s.pot;
    const diff = money(next) - money(before);
    if (Math.abs(diff) >= 1) {
      pushToast(diff > 0 ? `+${rupees(diff)}` : `−${rupees(-diff)}`, diff > 0 ? 'good' : 'bad');
      audio.sfx(diff > 0 ? 'coin' : 'spend');
    }
  };

  const persist = useCallback(() => {
    if (!pid || !lifeRef.current) return;
    stepsSinceSave.current = 0;
    void saveGame(pid, SLOT, { v: 1, life: lifeRef.current, pos: walker.current.pos, checkpoints: checkpoints.current, other: otherRef.current } satisfies Save);
  }, [pid]);

  // ── Loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loaded) void loadActiveProfile();
  }, [loaded]);

  useEffect(() => {
    if (!pid) return;
    let live = true;
    void Promise.all([loadGame<unknown>(pid, SLOT), loadAssets(PAISAPUR)]).then(([saved, a]) => {
      if (!live) return;
      assets.current = a;
      const s: Save = isSave(saved) ? saved : { v: 1, life: newLife(makeSeed(Date.now())), pos: startPos() };
      s.life = normalize(s.life);
      checkpoints.current = s.checkpoints ?? [];
      otherRef.current = s.other ? { ...s.other, life: normalize(s.other.life) } : null;
      setOther(otherRef.current);
      lifeRef.current = s.life;
      setLife(s.life);
      walker.current = { pos: s.pos, from: null, t: 0, foot: 0 };
      setMapId(s.pos.map);
      setTelemetryContext({ mode: 'lifepath', stage: `S${Math.min(6, s.life.chapter)}` as StageId, lifeStage: s.life.lifeStage });
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [pid]);

  // ── Talking to the story ────────────────────────────────────────────

  const ask = <T,>(o: Overlay): Promise<T> =>
    new Promise<T>((res) => {
      held.current = [];
      resolver.current = res as (v: unknown) => void;
      setOverlay(o);
    });

  const answer = (value?: unknown) => {
    const r = resolver.current;
    resolver.current = null;
    setOverlay(null);
    r?.(value);
  };

  const fadeTo = (target: number) =>
    new Promise<void>((res) => {
      if (reduceMotion) {
        fade.current = target;
        res();
        return;
      }
      const start = fade.current;
      const t0 = performance.now();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        fade.current = target;
        res();
      };
      const tick = (now: number) => {
        if (done) return;
        const k = Math.min(1, (now - t0) / FADE_MS);
        fade.current = start + (target - start) * k;
        if (k < 1) requestAnimationFrame(tick);
        else finish();
      };
      requestAnimationFrame(tick);
      // Background tabs pause animation frames; don't let the game wait on them.
      window.setTimeout(finish, FADE_MS + 150);
    });

  const logChoice = (spec: { concept: string; choice: string; correct?: boolean; misconception?: string }) => {
    const l = lifeRef.current!;
    void logEvent({
      activity: `paisapur.ch${l.chapter}`,
      concept: spec.concept,
      choice: spec.choice,
      correct: spec.correct,
      misconception: spec.misconception,
      mode: 'lifepath',
    });
  };

  const host: Host = {
    state: () => lifeRef.current!,
    dispatch: (a: Action) => {
      const before = lifeRef.current!;
      const after = reduce(before, a);
      commit(after);
      if (a.type === 'badge' && !before.badges.includes(a.id)) {
        pushToast(t('toast.badge', { name: t(`paisapur.badge.${a.id}.name`) }), 'info');
        audio.jingle('badge');
      }
      if (a.type === 'chapter') setTelemetryContext({ stage: `S${Math.min(6, a.n)}` as StageId });
    },
    say: (text, who) => ask<void>({ kind: 'say', text: t(text, vars()), who: who ? t(`who.${who}`) : undefined }),
    choose: (labels, prompt, who) =>
      ask<number>({ kind: 'choice', options: labels.map((l) => t(l, vars())), prompt: prompt ? t(prompt, vars()) : undefined, who: who ? t(`who.${who}`) : undefined }),
    concept: (id) => ask<void>({ kind: 'concept', id }),
    quiz: (ids) => ask<QuizResult>({ kind: 'quiz', ids }),
    open: (panel) => ask<void>({ kind: 'panel', panel: panel as Panel }),
    sleep: async () => {
      const before = lifeRef.current!;
      audio.jingle('sleep');
      await fadeTo(1);
      host.dispatch({ type: 'advanceMonth' });
      await ask<void>({ kind: 'night', before });
      await fadeTo(0);
    },
    warp: (to) => {
      walker.current = { pos: to, from: null, t: 0, foot: 0 };
      setMapId(to.map);
    },
    log: logChoice,
    toast: (key) => {
      pushToast(t(key, vars()), 'info');
      if (key === 'toast.goal') audio.jingle('goal');
    },
    duel: (id) => ask<'win' | 'lose'>({ kind: 'duel', id }),
    minigame: (id, level) => ask<MiniGameResult>({ kind: 'minigame', id, level }),
    checkpoint: (label) => {
      const start = sceneStart.current;
      if (!start) return;
      const l = start.life;
      checkpoints.current = addCheckpoint(checkpoints.current, {
        id: `${label}@${l.month}.${l.nextId}`,
        label,
        month: l.month,
        chapter: l.chapter,
        life: l,
        pos: start.pos,
        script: start.script,
      });
    },
  };
  const hostRef = useRef(host);
  hostRef.current = host;

  const autoGuard = useRef(0);

  const runAutos = async (): Promise<void> => {
    const l = lifeRef.current;
    if (!l || busy.current) return;
    const auto = pendingAuto(AUTOS, l, walker.current.pos.map);
    if (!auto) {
      autoGuard.current = 0;
      return;
    }
    if (++autoGuard.current > 8) return;
    await runStory(auto.script);
  };

  async function runStory(id: string): Promise<void> {
    if (busy.current) return;
    busy.current = true;
    held.current = [];
    sceneStart.current = { life: lifeRef.current!, pos: walker.current.pos, script: id };
    try {
      await runScript(SCRIPTS, id, hostRef.current);
    } catch (e) {
      console.error(e);
    } finally {
      busy.current = false;
      sceneStart.current = null;
      persist();
    }
    const next = afterScene.current;
    afterScene.current = null;
    if (next) await next();
    else await runAutos();
  }

  /** Puts the player into another life (a rewind or a switch) and replays a scene if given. */
  async function enterLife(l: LifeState, pos: Pos, cps: Checkpoint[], nextOther: OtherLife | null, replay?: string) {
    busy.current = true;
    await fadeTo(1);
    lifeRef.current = l;
    setLife(l);
    checkpoints.current = cps;
    otherRef.current = nextOther;
    setOther(nextOther);
    walker.current = { pos, from: null, t: 0, foot: 0 };
    npcFacing.current = {};
    setMapId(pos.map);
    await fadeTo(0);
    busy.current = false;
    persist();
    if (replay) await runStory(replay);
    else await runAutos();
  }

  function rewindTo(id: string) {
    const cp = checkpoints.current.find((c) => c.id === id);
    const r = rewind({ life: lifeRef.current!, pos: walker.current.pos, checkpoints: checkpoints.current }, id, cp?.label ?? 'whatif.other_life');
    if (!r) return;
    afterScene.current = () => enterLife(r.life, r.pos, r.checkpoints, r.other, r.replay);
    answer();
  }

  function switchLife() {
    const o = otherRef.current;
    if (!o) return;
    const here: OtherLife = { life: lifeRef.current!, pos: walker.current.pos, checkpoints: checkpoints.current, label: 'whatif.other_life' };
    afterScene.current = () => enterLife(o.life, o.pos, o.checkpoints, here);
    answer();
  }

  async function sayOnce(key: string) {
    if (busy.current) return;
    busy.current = true;
    await hostRef.current.say(key);
    busy.current = false;
  }

  async function warpTo(to: Pos) {
    busy.current = true;
    audio.sfx('door');
    await fadeTo(1);
    walker.current = { pos: to, from: null, t: 0, foot: 0 };
    npcFacing.current = {};
    setMapId(to.map);
    await fadeTo(0);
    busy.current = false;
    persist();
    await runAutos();
  }


  // ── Walking ─────────────────────────────────────────────────────────

  const blocked = () => busy.current || overlayRef.current !== null || !lifeRef.current;

  function tryMove(dir: Dir) {
    const w = walker.current;
    const res = step(PAISAPUR, cond, w.pos, dir);
    const moved = res.pos.x !== w.pos.x || res.pos.y !== w.pos.y;
    if (moved) {
      walker.current = { pos: res.pos, from: { x: w.pos.x, y: w.pos.y }, t: reduceMotion ? 1 : 0, foot: w.foot === 0 ? 1 : 0 };
      pendingStep.current = res.event;
      return;
    }
    walker.current = { ...w, pos: res.pos };
    if (res.event.type === 'warp') void warpTo(res.event.to);
    else if (res.event.type === 'blocked' && res.event.text) void sayOnce(res.event.text);
    else if (performance.now() - lastBump.current > 350) {
      lastBump.current = performance.now();
      audio.sfx('bump');
    }
  }

  function onStepDone() {
    const ev = pendingStep.current;
    pendingStep.current = null;
    if (++stepsSinceSave.current >= 12) persist();
    if (!ev) return;
    if (ev.type === 'warp') void warpTo(ev.to);
    else if (ev.type === 'trigger') void runStory(ev.script);
  }

  function pressA() {
    const it = interact(PAISAPUR, cond, walker.current.pos);
    if (!it) return;
    if (it.type === 'npc') {
      npcFacing.current[it.npc.id] = OPPOSITE[walker.current.pos.facing];
      void runStory(it.npc.script);
    } else if (it.type === 'sign') void sayOnce(it.text);
    else void runStory(it.script);
  }

  /** Something chosen in the menu that must happen after it closes (starting a new game). */
  const afterMenu = useRef<(() => Promise<void>) | null>(null);

  async function openMenu(screen: MenuScreen | null = null) {
    if (busy.current) return;
    busy.current = true;
    audio.sfx('open');
    await ask<void>({ kind: 'menu', screen });
    busy.current = false;
    const next = afterMenu.current;
    afterMenu.current = null;
    if (next) await next();
  }

  /** A brand-new year for this player: new world seed, everything else from scratch. */
  async function startOver() {
    await enterLife(newLife(makeSeed(Date.now())), startPos(), [], null);
  }

  // Effects below read the latest versions of these through a ref.
  const latest = useRef({ tryMove, onStepDone, pressA, openMenu, runAutos });
  useEffect(() => {
    latest.current = { tryMove, onStepDone, pressA, openMenu, runAutos };
  });

  // Run any auto script (e.g. the birthday intro) once the game is ready.
  useEffect(() => {
    if (ready) void latest.current.runAutos();
  }, [ready]);

  // Keyboard (and the touch pad, which sends the same keys).
  useEffect(() => {
    if (!ready) return;
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = KEY_DIRS[e.key];
      if (dir) {
        if (!overlayRef.current) e.preventDefault();
        if (!held.current.includes(dir)) held.current.push(dir);
        // A quick tap may be released before the next frame, so take the step now.
        if (!e.repeat && !walker.current.from && !blocked()) latest.current.tryMove(dir);
        return;
      }
      if (e.repeat || blocked()) return;
      if (KEY_A.has(e.key)) {
        e.preventDefault();
        latest.current.pressA();
      } else if (KEY_MENU.has(e.key)) {
        e.preventDefault();
        void latest.current.openMenu();
      }
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.key];
      if (dir) held.current = held.current.filter((d) => d !== dir);
    };
    const blur = () => (held.current = []);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [ready]);

  // The frame loop: advance the step animation, start new steps, draw.
  useEffect(() => {
    if (!ready) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !assets.current) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const w = walker.current;
      if (w.from) {
        w.t = Math.min(1, w.t + (now - last) / STEP_MS);
        if (w.t >= 1) {
          w.from = null;
          latest.current.onStepDone();
        }
      }
      if (!w.from && !blocked() && held.current.length) latest.current.tryMove(held.current[held.current.length - 1]!);
      draw(ctx, assets.current!, {
        world: PAISAPUR,
        cond,
        walker: walker.current,
        playerSprite: lifeRef.current?.look ?? 'player_a',
        npcFacing: npcFacing.current,
        fade: fade.current,
      });
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, cond]);

  // Music: the area's theme, or the battle theme during a Scam Duel.
  const inDuel = overlay?.kind === 'duel';
  useEffect(() => {
    if (!ready) return;
    audio.play(inDuel ? 'battle' : trackForMap(mapId));
  }, [ready, mapId, inDuel]);

  // Sound can only start after the player presses something.
  useEffect(() => {
    void audio.load();
    const unlock = () => audio.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    return () => {
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
      audio.stop();
    };
  }, []);

  // Save when the tab is hidden or closed.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && persist();
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [persist]);

  // ── Render ──────────────────────────────────────────────────────────

  if (!loaded || (profile && !ready)) return <Spinner />;
  if (!profile) return <Navigate to="/" replace />;
  if (!life) return <Spinner />;

  const act = (a: Action): string | null => {
    const err = check(lifeRef.current!, a);
    if (err) return err;
    host.dispatch(a);
    return null;
  };

  const onQuizAnswer = (q: { id: string; concept: string; misconceptions?: Record<string, string> }, option: string, correct: boolean) => {
    host.dispatch({ type: 'learn', concept: q.concept, correct });
    logChoice({ concept: q.concept, choice: `${q.id}:${option}`, correct, misconception: correct ? undefined : q.misconceptions?.[option] });
  };

  const panel = (() => {
    if (!overlay) return null;
    switch (overlay.kind) {
      case 'duel':
        return (
          <DuelScreen
            id={overlay.id}
            playerName={name}
            playerSprite={life.look}
            instant={reduceMotion}
            onAnswer={(tactic, option, effect) => {
              audio.sfx(effect === 'counter' ? 'spot' : 'hit');
              logChoice({ concept: duelById(overlay.id).concept, choice: `${overlay.id}.${tactic}:${option}`, correct: effect === 'counter' });
            }}
            onDone={(outcome) => {
              audio.jingle(outcome === 'win' ? 'victory' : 'defeat');
              answer(outcome);
            }}
          />
        );
      case 'minigame': {
        const game = getUiGame(overlay.id);
        // A script naming a game that is not registered is a content bug, not
        // a reason to trap the player in the scene. The validator catches it
        // before it ships; this keeps the story moving if one slips through.
        if (!game) return <MissingGame id={overlay.id} onClose={() => answer(emptyResult())} />;
        const Play = game.Component;
        return (
          // Games are styled for a light page; give them a parchment panel over the dark overlay.
          <div className="minigame pixel-raised max-h-[92dvh] w-full max-w-xl overflow-y-auto bg-parchment p-4 text-ink">
            {/* Keyed so a game that opens twice starts over rather than
                resuming the state of the previous time it ran. */}
            <Play
              key={`${overlay.id}:${overlaySeq}`}
              ctx={contextFromLife(life, { level: overlay.level })}
              onComplete={(r) => answer(r)}
            />
          </div>
        );
      }
      case 'concept':
        return <ConceptCard id={overlay.id} onDone={() => answer()} />;
      case 'quiz':
        return <QuizPanel ids={overlay.ids} onAnswer={onQuizAnswer} onDone={(r) => answer(r)} />;
      case 'night':
        return <NightSummary before={overlay.before} life={life} onClose={() => answer()} />;
      case 'menu':
        return (
          <StartMenu
            life={life}
            name={name}
            pid={pid ?? ''}
            initial={overlay.screen}
            onReset={() => {
              afterMenu.current = startOver;
              answer();
            }}
            onClose={() => answer()}
            onSave={() => {
              persist();
              pushToast(t('toast.saved'), 'info');
            }}
            onQuit={() => {
              persist();
              answer();
              navigate('/');
            }}
          />
        );
      case 'panel': {
        const close = () => answer();
        const p = overlay.panel;
        if (p === 'bank') return <BankPanel life={life} act={act} onClose={close} />;
        if (p === 'shop:zaroorat' || p === 'shop:shauq') return <ShopPanel shop={p === 'shop:zaroorat' ? 'zaroorat' : 'shauq'} life={life} act={act} onClose={close} />;
        if (p === 'loan:bank' || p === 'loan:moneylender' || p === 'loan:education')
          return <LoanPanel kind={p === 'loan:bank' ? 'bank' : p === 'loan:education' ? 'education' : 'moneylender'} life={life} act={act} onClose={close} />;
        if (p === 'whatif')
          return <WhatIfPanel life={life} checkpoints={checkpoints.current} other={other} onRewind={rewindTo} onSwitch={switchLife} onClose={close} />;
        if (p === 'rival') return <RivalPanel life={life} onClose={close} />;
        if (p === 'bonds') return <BondPanel life={life} act={act} onClose={close} />;
        if (p === 'exchange') return <ExchangePanel life={life} act={act} onClose={close} />;
        if (p === 'news') return <NewsPanel life={life} onClose={close} />;
        if (p === 'year') return <YearPanel life={life} name={name} onClose={close} />;
        return (
          <StartMenu
            life={life}
            name={name}
            pid={pid ?? ''}
            initial={p === 'wallet' ? 'wallet' : 'journal'}
            onClose={close}
            onSave={persist}
            onQuit={close}
            onReset={close}
          />
        );
      }
      default:
        return null;
    }
  })();

  const speech =
    overlay?.kind === 'say' ? (
      <DialogueBox key={overlaySeq} text={overlay.text} speaker={overlay.who} instant={reduceMotion} onNext={() => answer()} />
    ) : overlay?.kind === 'choice' ? (
      <ChoiceBox key={overlaySeq} prompt={overlay.prompt} speaker={overlay.who} options={overlay.options} onPick={(i) => answer(i)} />
    ) : null;

  return (
    <div className="flex min-h-dvh flex-col items-center bg-[#10141c] px-2 py-2 text-white">
      <div className="w-full max-w-3xl">
        <Hud life={life} mapName={t(PAISAPUR.maps[mapId]?.name ?? 'maps.paisapur')} onMenu={() => void openMenu()} />
        <div className="relative overflow-hidden rounded-b-md bg-black">
          <canvas
            ref={canvasRef}
            width={VIEW_W * TILE}
            height={VIEW_H * TILE}
            className="block w-full"
            style={{ imageRendering: 'pixelated', aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
            role="img"
            aria-label={t('paisapur.canvas_label', { place: t(PAISAPUR.maps[mapId]?.name ?? '') })}
          />
          <Toasts toasts={toasts} />
          {speech && wide && <div className="absolute inset-x-2 bottom-2">{speech}</div>}
        </div>
        <p className="mt-1 truncate rounded bg-[#1d2433] px-2 py-1 text-sm" title={t(life.objective)}>
          🎯 {t(life.objective)}
        </p>
        {speech && !wide && <div className="mt-2">{speech}</div>}
        {!speech && <Controls />}
        <p className="mt-2 hidden text-center text-xs text-slate-400 md:block">{t('paisapur.keys_hint')}</p>
      </div>
      {panel && <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-2 text-[#2b2b2b]">{panel}</div>}
    </div>
  );
}

/** An empty result, so a missing game still resolves the script's promise. */
function emptyResult(): MiniGameResult {
  return { choices: [], conceptDeltas: {}, misconceptions: [], summaryKey: 'errors.missing_game' };
}

function MissingGame({ id, onClose }: { id: string; onClose: () => void }) {
  return (
    <div className="minigame w-full max-w-md bg-parchment p-4 text-ink">
      <p>{t('errors.missing_game', { id })}</p>
      <button type="button" className="pixel-frame mt-3 bg-parchment px-4 py-2 font-bold" onClick={onClose}>
        {t('common.continue')}
      </button>
    </div>
  );
}
