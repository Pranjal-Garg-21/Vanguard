/**
 * Overlay UI for the overworld: dialogue box, choices, concept cards, quiz,
 * HUD, toasts and touch controls (see input.ts for keys).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { emergencyFund, needsCost, type LifeState } from '@/core/engine';
import { quizById, type QuizQuestion } from '@/core/story/content';
import type { QuizResult } from '@/core/story';
import { autoSpeak, stopSpeaking, t } from '@/platform';
import { AudioButton } from '@/ui';
import conceptsJson from '@/content/concepts.json';
import { audio } from './audio/engine';
import { useAudioSettings } from './audio/useAudioSettings';
import { KEY_A, KEY_B, pressKey, useKeys } from './input';
import { rupees } from './logic/format';

/**
 * Reads what is on screen aloud when the student ticked "Read things aloud", and stops when it goes away. The
 * speaker button beside a box does the same on demand, for everyone.
 */
function useNarration(text: string): void {
  useEffect(() => {
    autoSpeak(text, { id: text });
    return stopSpeaking;
  }, [text]);
}

/** The classic two-border text box. */
export function Box({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border-4 border-[#3a4a6b] bg-[#f8f8f0] p-1 text-[#2b2b2b] shadow-[0_4px_0_rgba(0,0,0,0.35)] ${className}`}>
      <div className="rounded-sm border-2 border-[#8fb0d8] px-3 py-2">{children}</div>
    </div>
  );
}

/** Reveals text a few letters at a time. Mount with a new key for each line. */
function useTypewriter(text: string, instant: boolean) {
  const [shown, setShown] = useState(instant ? text.length : 0);
  useEffect(() => {
    if (instant) return;
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) window.clearInterval(id);
        return Math.min(text.length, n + 2);
      });
    }, 22);
    return () => window.clearInterval(id);
  }, [text, instant]);
  const count = instant ? text.length : shown;
  return { visible: text.slice(0, count), done: count >= text.length, finish: () => setShown(text.length) };
}

export function DialogueBox({ text, speaker, instant, onNext }: { text: string; speaker?: string; instant: boolean; onNext: () => void }) {
  const tw = useTypewriter(text, instant);
  const spoken = speaker ? `${speaker}. ${text}` : text;
  useNarration(spoken);
  const next = () => {
    if (!tw.done) return tw.finish();
    audio.sfx('blip');
    onNext();
  };
  useKeys((k) => {
    if (KEY_A.has(k) || KEY_B.has(k)) next();
  });
  return (
    <div className="relative">
    <button type="button" onClick={next} className="block w-full text-left" aria-live="polite">
      <Box>
        {speaker && <p className="mb-1 text-sm font-bold text-[#c0392b]">{speaker}</p>}
        <p className="min-h-[3.5rem] text-base leading-snug md:text-lg">
          {tw.visible}
          <span className="sr-only">{text.slice(tw.visible.length)}</span>
        </p>
        <p className={`text-right text-sm ${tw.done ? 'animate-bounce' : 'invisible'}`} aria-hidden="true">
          ▼
        </p>
      </Box>
    </button>
    <AudioButton text={spoken} className="absolute end-3 top-3 bg-[#f8f8f0] text-[#3a4a6b]" />
    </div>
  );
}

export function ChoiceBox({ prompt, speaker, options, onPick }: { prompt?: string; speaker?: string; options: string[]; onPick: (i: number) => void }) {
  const [cursor, setCursor] = useState(0);
  const spoken = [speaker, prompt, ...options.map((o, i) => `${i + 1}. ${o}`)].filter(Boolean).join('. ');
  useNarration(spoken);
  const pick = (i: number) => {
    audio.sfx('select');
    onPick(i);
  };
  useKeys((k) => {
    if (k === 'ArrowUp' || k === 'w') {
      audio.sfx('cursor');
      setCursor((c) => (c + options.length - 1) % options.length);
    }
    if (k === 'ArrowDown' || k === 's') {
      audio.sfx('cursor');
      setCursor((c) => (c + 1) % options.length);
    }
    if (KEY_A.has(k)) pick(cursor);
  });
  return (
    <div className="flex flex-col gap-2">
      {prompt && (
        <div className="relative">
          <Box>
            {speaker && <p className="mb-1 text-sm font-bold text-[#c0392b]">{speaker}</p>}
            <p className="pe-12 text-base md:text-lg">{prompt}</p>
          </Box>
          <AudioButton text={spoken} className="absolute end-3 top-3 bg-[#f8f8f0] text-[#3a4a6b]" />
        </div>
      )}
      <Box className="ml-auto w-full sm:w-auto sm:min-w-[60%]">
        <ul role="listbox" aria-label={prompt ?? t('paisapur.choose')}>
          {options.map((o, i) => (
            <li key={i}>
              <button
                type="button"
                role="option"
                aria-selected={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(i)}
                className="flex w-full items-start gap-2 py-1.5 text-left text-base md:text-lg"
              >
                <span className={`w-4 shrink-0 ${i === cursor ? '' : 'invisible'}`} aria-hidden="true">
                  ▶
                </span>
                <span>{o}</span>
              </button>
            </li>
          ))}
        </ul>
      </Box>
    </div>
  );
}

const ICONS: Record<string, string> = Object.fromEntries(conceptsJson.concepts.map((c) => [c.id, c.icon]));

export function ConceptCard({ id, onDone }: { id: string; onDone: () => void }) {
  useEffect(() => audio.sfx('learn'), [id]);
  useKeys((k) => {
    if (KEY_A.has(k) || KEY_B.has(k)) onDone();
  });
  return (
    <Box>
      <p className="text-xs font-bold tracking-wide text-[#3a4a6b] uppercase">{t('paisapur.concept.new')}</p>
      <div className="mt-1 flex items-start gap-3">
        <span className="text-4xl" aria-hidden="true">
          {ICONS[id] ?? '📘'}
        </span>
        <div>
          <h2 className="text-xl font-bold">{t(`concepts.${id}.title`)}</h2>
          <p className="mt-1 text-base leading-snug">{t(`concepts.${id}.body`)}</p>
          <p className="mt-2 rounded bg-[#fff6d6] p-2 text-sm leading-snug">
            <span className="font-bold">{t('paisapur.concept.example')} </span>
            {t(`concepts.${id}.example`)}
          </p>
        </div>
      </div>
      <button type="button" autoFocus onClick={onDone} className="mt-3 w-full rounded bg-[#3a4a6b] py-2 font-bold text-white">
        {t('paisapur.concept.got_it')}
      </button>
    </Box>
  );
}

export function QuizPanel({ ids, onAnswer, onDone }: { ids: string[]; onAnswer: (q: QuizQuestion, option: string, correct: boolean) => void; onDone: (r: QuizResult) => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<QuizResult>([]);
  const [cursor, setCursor] = useState(0);
  const q = quizById(ids[index]!)!;

  function pick(option: string) {
    if (picked) return;
    const correct = option === q.answer;
    audio.sfx(correct ? 'right' : 'wrong');
    setPicked(option);
    setResults((r) => [...r, { id: q.id, correct }]);
    onAnswer(q, option, correct);
  }
  function next() {
    if (index + 1 < ids.length) {
      setIndex(index + 1);
      setPicked(null);
      setCursor(0);
    } else onDone(results);
  }
  useKeys((k) => {
    if (picked) {
      if (KEY_A.has(k)) next();
      return;
    }
    if (k === 'ArrowUp' || k === 'w') setCursor((c) => (c + q.options.length - 1) % q.options.length);
    if (k === 'ArrowDown' || k === 's') setCursor((c) => (c + 1) % q.options.length);
    if (KEY_A.has(k)) pick(q.options[cursor]!);
  });

  const right = picked === q.answer;
  return (
    <Box>
      <p className="text-xs font-bold tracking-wide text-[#3a4a6b] uppercase">
        {t('paisapur.quiz.title', { n: index + 1, total: ids.length })}
      </p>
      <h2 className="mt-1 text-lg font-bold leading-snug">{t(`quiz.${q.id}.q`)}</h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {q.options.map((o, i) => {
          const state = !picked ? (i === cursor ? 'cursor' : '') : o === q.answer ? 'right' : o === picked ? 'wrong' : '';
          return (
            <li key={o}>
              <button
                type="button"
                disabled={!!picked}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(o)}
                className={`w-full rounded border-2 px-3 py-2 text-left text-base ${
                  state === 'right'
                    ? 'border-green-700 bg-green-100'
                    : state === 'wrong'
                      ? 'border-red-700 bg-red-100'
                      : state === 'cursor'
                        ? 'border-[#3a4a6b] bg-[#e8eef8]'
                        : 'border-transparent bg-white'
                }`}
              >
                {t(`quiz.${q.id}.${o}`)}
              </button>
            </li>
          );
        })}
      </ul>
      {picked && (
        <div className="mt-2" aria-live="polite">
          <p className={`font-bold ${right ? 'text-green-800' : 'text-red-800'}`}>{right ? t('paisapur.quiz.right') : t('paisapur.quiz.wrong')}</p>
          <p className="text-sm leading-snug">{t(`quiz.${q.id}.why`)}</p>
          <button type="button" autoFocus onClick={next} className="mt-2 w-full rounded bg-[#3a4a6b] py-2 font-bold text-white">
            {index + 1 < ids.length ? t('paisapur.quiz.next') : t('paisapur.quiz.finish')}
          </button>
        </div>
      )}
    </Box>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1" title={`${label}: ${value}/100`}>
      <span className="text-[10px] font-bold uppercase">{label}</span>
      <span className="h-2 w-16 overflow-hidden rounded-full bg-black/30" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span className="block h-full" style={{ width: `${value}%`, background: color }} />
      </span>
    </div>
  );
}

export function Hud({ life, mapName, onMenu, onHelp }: { life: LifeState; mapName: string; onMenu: () => void; onHelp: () => void }) {
  const peaceColor = life.peace > 60 ? '#3fb950' : life.peace > 30 ? '#e3b341' : '#f85149';
  const months = Math.floor(emergencyFund(life) / Math.max(1, needsCost(life)));
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-t-md bg-[#1d2433] px-3 py-1.5 text-sm text-white">
      <span className="font-bold">
        {mapName} · {t('paisapur.hud.month', { n: life.month })}
      </span>
      <span className="flex items-center gap-3">
        <span title={t('paisapur.hud.cash')}>💵 {rupees(life.cash)}</span>
        {life.bank.open && <span title={t('paisapur.hud.bank')}>🏦 {rupees(life.bank.balance + life.pot)}</span>}
        {life.chapter >= 3 && <span title={t('paisapur.hud.fund_months')}>🛟 {months}</span>}
        <Meter label={t('paisapur.hud.peace')} value={life.peace} color={peaceColor} />
        <MuteButton />
        <button type="button" onClick={onHelp} className="rounded bg-[#a3ea2a] px-2 py-0.5 text-xs font-bold text-[#141c2e] hover:bg-[#b8f550]">
          {t('paisapur.hud.help')}
        </button>
        <button type="button" onClick={onMenu} className="rounded bg-white/15 px-2 py-0.5 text-xs font-bold hover:bg-white/25">
          {t('paisapur.hud.menu')}
        </button>
      </span>
    </div>
  );
}

export type Toast = { id: number; text: string; tone: 'good' | 'bad' | 'info' };

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none absolute top-2 right-2 flex flex-col items-end gap-1" aria-live="polite">
      {toasts.map((x) => (
        <span
          key={x.id}
          className={`rounded px-2 py-1 text-sm font-bold shadow ${
            x.tone === 'good' ? 'bg-green-600 text-white' : x.tone === 'bad' ? 'bg-red-600 text-white' : 'bg-[#1d2433] text-white'
          }`}
        >
          {x.text}
        </span>
      ))}
    </div>
  );
}

/** Touch controls: D-pad (hold to walk), A, B and Menu. */
export function Controls() {
  const dir = (key: string, glyph: string, label: string, cls: string) => (
    <button
      type="button"
      aria-label={label}
      className={`flex h-14 w-14 items-center justify-center rounded-md bg-[#2b3245] text-2xl text-white select-none active:bg-[#475069] ${cls}`}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        pressKey(key);
      }}
      onPointerUp={() => pressKey(key, 'keyup')}
      onPointerCancel={() => pressKey(key, 'keyup')}
      onContextMenu={(e) => e.preventDefault()}
    >
      {glyph}
    </button>
  );
  const action = (key: string, glyph: string, label: string, cls: string) => (
    <button
      type="button"
      aria-label={label}
      className={`flex items-center justify-center rounded-full font-bold text-white select-none active:brightness-125 ${cls}`}
      onPointerDown={(e) => {
        e.preventDefault();
        pressKey(key);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {glyph}
    </button>
  );
  return (
    <div className="mt-3 flex items-center justify-between px-2 select-none md:hidden">
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        {dir('ArrowUp', '▲', t('paisapur.pad.up'), 'col-start-2')}
        {dir('ArrowLeft', '◀', t('paisapur.pad.left'), 'col-start-1 row-start-2')}
        {dir('ArrowDown', '▼', t('paisapur.pad.down'), 'col-start-2 row-start-3')}
        {dir('ArrowRight', '▶', t('paisapur.pad.right'), 'col-start-3 row-start-2')}
      </div>
      <div className="flex flex-col items-center gap-3">
        {action('m', t('paisapur.pad.menu'), t('paisapur.pad.menu'), 'h-8 w-20 rounded-md bg-[#475069] text-xs')}
        <div className="flex items-center gap-3">
          {action('x', 'B', t('paisapur.pad.b'), 'mt-6 h-14 w-14 bg-[#8a2b3b] text-xl')}
          {action('z', 'A', t('paisapur.pad.a'), 'h-16 w-16 bg-[#2b8a3e] text-2xl')}
        </div>
      </div>
    </div>
  );
}

function MuteButton() {
  const s = useAudioSettings();
  return (
    <button
      type="button"
      onClick={() => {
        audio.unlock();
        audio.update({ muted: !s.muted });
      }}
      aria-label={s.muted ? t('sound.off') : t('sound.on')}
      aria-pressed={!s.muted}
      className="rounded bg-white/15 px-1.5 py-0.5 text-xs hover:bg-white/25"
    >
      {s.muted ? '🔇' : '🔊'}
    </button>
  );
}
