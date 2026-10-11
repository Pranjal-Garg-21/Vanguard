/**
 * What the player sees right after a decision that teaches something: a good choice gets the reason it was good, a
 * poor one gets the idea it missed and links to practise it (a lesson, a simulation or a mini game).
 */
import { useMemo } from 'react';
import { t } from '@/platform';
import { KEY_A, KEY_B, useKeys } from './input';
import { learnLinks } from './learnLinks';
import { Box } from './ui';

export type Decision = { concept: string; choice: string; correct?: boolean; misconception?: string };

export function FeedbackCard({ decision, onDone, onGo }: { decision: Decision; onDone: () => void; onGo: (to: string) => void }) {
  const good = decision.correct !== false;
  const links = useMemo(() => (good ? [] : learnLinks(decision.concept)), [good, decision.concept]);

  // Z, Enter or Space carries on, like every other box in the game.
  useKeys((k) => {
    if (KEY_A.has(k) || KEY_B.has(k)) onDone();
  });

  const why = decision.misconception ? t(`misconception.${decision.misconception}`) : t(`concepts.${decision.concept}.body`);

  return (
    <div className="mx-auto w-full max-w-md" role="dialog" aria-modal="true" aria-label={t(good ? 'paisapur.decision.goodTitle' : 'paisapur.decision.badTitle')}>
      <Box>
        <p className={`text-base font-bold ${good ? 'text-green-700' : 'text-amber-700'}`}>{t(good ? 'paisapur.decision.goodTitle' : 'paisapur.decision.badTitle')}</p>
        <p className="mt-1 text-sm font-bold text-[#3a4a6b]">{t(`concepts.${decision.concept}.title`)}</p>
        <p className="mt-1 text-sm">
          <span className="font-bold">{t(good ? 'paisapur.decision.whyGood' : 'paisapur.decision.whyBad')} </span>
          {why}
        </p>
        {links.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-bold">{t('paisapur.decision.practise')}</p>
            <ul className="mt-1 flex flex-col gap-1">
              {links.map((l) => (
                <li key={l.kind}>
                  <button type="button" onClick={() => onGo(l.to)} className="w-full rounded bg-[#3a4a6b] px-3 py-1.5 text-start text-sm font-bold text-white">
                    {l.label ?? t(`paisapur.decision.link.${l.kind}`)}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs">{t('paisapur.decision.saved')}</p>
          </div>
        )}
        <button type="button" autoFocus onClick={onDone} className="mt-3 w-full rounded bg-[#a3ea2a] py-2 font-bold text-[#141c2e]">
          {t('common.continue')}
        </button>
      </Box>
    </div>
  );
}
