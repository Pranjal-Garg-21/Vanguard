/**
 * The Start menu, classic handheld style: a list box in the top-right corner
 * (▲ ▼ to move, A to choose, B or MENU to close). Each entry opens its own
 * screen: Bag, Journal, Trainer-style Card, Badges, Wallet, Sound, Save,
 * New game and Exit.
 */
import { useState, type ReactNode } from 'react';
import { emergencyFund, netWorth, type LifeState } from '@/core/engine';
import { BADGES, CONCEPTS } from '@/core/story/content';
import { t } from '@/platform';
import { audio } from './audio/engine';
import { SoundSettings } from './audio/SoundSettings';
import { KEY_A, KEY_B, KEY_MENU, useKeys } from './input';
import { rupees } from './logic/format';
import { Feedback, Help } from './help';
import { Bag, Badges, Journal, Wallet } from './panels';
import { Sprite } from './sprite';
import { Box } from './ui';

export type MenuScreen = 'bag' | 'journal' | 'card' | 'badges' | 'wallet' | 'sound' | 'reset' | 'help' | 'feedback';
type Entry = MenuScreen | 'save' | 'quit' | 'exit';

const ENTRIES: { id: Entry; icon: string }[] = [
  { id: 'help', icon: '💡' },
  { id: 'feedback', icon: '📝' },
  { id: 'bag', icon: '🎒' },
  { id: 'journal', icon: '📔' },
  { id: 'card', icon: '🪪' },
  { id: 'badges', icon: '🏅' },
  { id: 'wallet', icon: '👛' },
  { id: 'sound', icon: '🔊' },
  { id: 'save', icon: '💾' },
  { id: 'reset', icon: '🔄' },
  { id: 'quit', icon: '🚪' },
  { id: 'exit', icon: '✖️' },
];

type Props = {
  life: LifeState;
  name: string;
  pid: string;
  /** Open straight to a screen (B then closes the menu), or null for the list. */
  initial: MenuScreen | null;
  /** The name of the place the player is standing in, for the Help screen. */
  place?: string;
  onClose: () => void;
  onSave: () => void;
  onQuit: () => void;
  onReset: () => void;
};

export function StartMenu(props: Props) {
  const { life, initial, onClose } = props;
  const [screen, setScreen] = useState<MenuScreen | null>(initial);
  const [cursor, setCursor] = useState(0);

  const choose = (id: Entry) => {
    audio.sfx('select');
    if (id === 'exit') return onClose();
    if (id === 'save') return props.onSave();
    if (id === 'quit') return props.onQuit();
    setScreen(id);
  };

  // List view keys (screens handle their own, and B goes back).
  useKeys((k) => {
    if (screen) return;
    if (k === 'ArrowUp' || k === 'w') {
      audio.sfx('cursor');
      setCursor((c) => (c + ENTRIES.length - 1) % ENTRIES.length);
    } else if (k === 'ArrowDown' || k === 's') {
      audio.sfx('cursor');
      setCursor((c) => (c + 1) % ENTRIES.length);
    } else if (KEY_A.has(k)) choose(ENTRIES[cursor]!.id);
    else if (KEY_B.has(k) || KEY_MENU.has(k)) onClose();
  });

  if (screen) {
    const back = () => (initial ? onClose() : setScreen(null));
    return (
      <Screen title={t(`menu.item.${screen}`)} onBack={back} backLabel={initial ? t('paisapur.close') : t('menu.back')}>
        {screen === 'help' && <Help life={life} place={props.place} />}
        {screen === 'feedback' && <Feedback life={life} />}
        {screen === 'bag' && <Bag life={life} onUse={(to) => setScreen(to)} />}
        {screen === 'journal' && <Journal life={life} />}
        {screen === 'card' && <PlayerCard {...props} />}
        {screen === 'badges' && <Badges life={life} />}
        {screen === 'wallet' && <Wallet life={life} />}
        {screen === 'sound' && <SoundSettings />}
        {screen === 'reset' && <ResetScreen onConfirm={props.onReset} onCancel={back} />}
      </Screen>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl justify-end self-start pt-9">
    <div className="flex w-60 flex-col gap-2" role="dialog" aria-modal="true" aria-label={t('menu.title')}>
      <Box>
        <ul role="menu" aria-label={t('menu.title')}>
          {ENTRIES.map((e, i) => (
            <li key={e.id} role="none">
              <button
                type="button"
                role="menuitem"
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(e.id)}
                className={`flex w-full items-center gap-2 rounded px-1 py-1 text-left text-base font-bold tracking-wide uppercase ${
                  i === cursor ? 'bg-[#e8eef8]' : ''
                } ${e.id === 'reset' ? 'text-red-800' : ''}`}
              >
                <span className={`w-4 ${i === cursor ? '' : 'invisible'}`} aria-hidden="true">
                  ▶
                </span>
                <span aria-hidden="true">{e.icon}</span>
                {t(`menu.item.${e.id}`)}
              </button>
            </li>
          ))}
        </ul>
      </Box>
      <Box>
        <p className="text-sm">
          <span className="font-bold">{t('paisapur.menu.objective')} </span>
          {t(life.objective)}
        </p>
      </Box>
    </div>
    </div>
  );
}

function Screen({ title, onBack, backLabel, children }: { title: string; onBack: () => void; backLabel: string; children: ReactNode }) {
  useKeys((k) => {
    if (KEY_B.has(k)) onBack();
  });
  return (
    <div className="mx-auto flex max-h-full w-full max-w-3xl flex-col" role="dialog" aria-modal="true" aria-label={title}>
      <Box className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b-2 border-[#8fb0d8] pb-2">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onBack} className="rounded bg-[#3a4a6b] px-3 py-1 text-sm font-bold text-white">
            {backLabel}
          </button>
        </div>
        <div className="mt-2 max-h-[70dvh] overflow-y-auto pr-1">{children}</div>
      </Box>
    </div>
  );
}

/** The trainer-card-style player card: who you are and how your money year is going. */
function PlayerCard({ life, name, pid }: Props) {
  const seen = CONCEPTS.filter((c) => life.journal[c.id]).length;
  const mastered = CONCEPTS.filter((c) => life.journal[c.id] === 'mastered').length;
  const goalShare = life.flags.goal_done ? 1 : Math.min(1, life.pot / Math.max(1, life.goal.target));
  const idNo = String(parseInt(pid.replace(/[^0-9a-f]/gi, '').slice(-5) || '0', 16) % 100000).padStart(5, '0');
  const row = (label: string, value: ReactNode) => (
    <div className="flex justify-between gap-2 border-b border-white/40 py-1">
      <span className="font-bold">{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
  return (
    <div className="rounded-xl border-4 border-[#3a4a6b] bg-gradient-to-br from-[#bfe3f2] to-[#f6e7b0] p-3 text-[#2b2b2b]">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold tracking-widest">{t('menu.card.heading')}</p>
        <p className="text-sm font-bold">
          {t('menu.card.id')} {idNo}
        </p>
      </div>
      <div className="mt-2 flex gap-3">
        <div className="flex-1 text-sm">
          {row(t('menu.card.name'), name)}
          {row(t('menu.card.money'), rupees(life.cash + life.bank.balance + life.pot))}
          {row(t('menu.card.worth'), rupees(netWorth(life)))}
          {row(t('menu.card.savings'), rupees(emergencyFund(life)))}
          {row(t('menu.card.month'), t('menu.card.month_value', { n: life.month, chapter: t(`paisapur.chapter.${Math.min(6, life.chapter)}`) }))}
          {row(t('menu.card.journal'), t('menu.card.journal_value', { seen, mastered, total: CONCEPTS.length }))}
          <div className="py-1">
            <div className="flex justify-between">
              <span className="font-bold">{t('menu.card.goal')}</span>
              <span>{t(`paisapur.goal.${life.goal.id}`)}</span>
            </div>
            <span className="mt-1 block h-2.5 overflow-hidden rounded-full bg-white/70" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(goalShare * 100)}>
              <span className="block h-full bg-[#2a78d6]" style={{ width: `${goalShare * 100}%` }} />
            </span>
          </div>
        </div>
        <div className="flex w-28 shrink-0 items-end justify-center rounded-lg bg-white/50">
          <Sprite sprite={life.look} dir="down" size={96} label={name} />
        </div>
      </div>
      <p className="mt-3 text-xs font-bold tracking-widest uppercase">{t('menu.card.badges')}</p>
      <ul className="mt-1 grid grid-cols-6 gap-1.5">
        {BADGES.map((b) => {
          const has = life.badges.includes(b);
          return (
            <li key={b} className={`flex h-12 items-center justify-center rounded-md text-2xl ${has ? 'bg-white/80' : 'bg-black/15'}`} title={has ? t(`paisapur.badge.${b}.name`) : '???'}>
              <span aria-label={has ? t(`paisapur.badge.${b}.name`) : t('menu.card.locked')}>{has ? t(`paisapur.badge.${b}.icon`) : ''}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Starting a new year, with a two-step confirmation. */
function ResetScreen({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [sure, setSure] = useState(false);
  return (
    <div className="text-sm">
      <p>{t('menu.reset.intro')}</p>
      <ul className="mt-2 list-disc pl-5">
        <li>{t('menu.reset.lost')}</li>
        <li>{t('menu.reset.kept')}</li>
      </ul>
      {!sure ? (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setSure(true)} className="rounded bg-red-700 px-3 py-1.5 font-bold text-white">
            {t('menu.reset.start')}
          </button>
          <button type="button" autoFocus onClick={onCancel} className="rounded bg-[#3a4a6b] px-3 py-1.5 font-bold text-white">
            {t('menu.reset.keep')}
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded bg-red-100 p-2" role="alert">
          <p className="font-bold">{t('menu.reset.really')}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={onConfirm} className="rounded bg-red-700 px-3 py-1.5 font-bold text-white">
              {t('menu.reset.yes')}
            </button>
            <button type="button" autoFocus onClick={onCancel} className="rounded bg-[#3a4a6b] px-3 py-1.5 font-bold text-white">
              {t('menu.reset.no')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
