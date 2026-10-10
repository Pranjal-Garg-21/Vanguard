/**
 * UC-SAFE-10 Rescue Mission — P3.
 *
 * Built here, not in P5's `games/safe/`, because it runs on the Rank verb
 * (work_division P3.6). Imran lost ₹2,000 to a fake job site; the student puts
 * the six recovery steps in order, and a faster correct order gives a better
 * chance of getting the money back.
 *
 * Two rules from Implementation.md 12.8 are structural here, not cosmetic:
 *   • The game asks the student NOTHING about their own experiences. The friend
 *     lost the money, never the player.
 *   • The clock shows that speed matters. It is not a countdown, nothing is
 *     taken away when it runs, and there is no failure state.
 */

import { useMemo, useState } from 'react';

import { useT } from '@/platform';
import { Rank, type RankDetail, type RankItem } from '@/runtime/verbs/rank';
import type { VerbOutcome } from '@/runtime/verbs/types';
import { combine, type GameProps } from '../shared/game';
import { conceptMap } from '@/runtime/verbs/types';
import content from '@/content/scenarios/safe/rescue-mission.json';
import { recoveryChance } from './logic/recovery';

export function RescueMission({ ctx, onComplete }: GameProps) {
  const t = useT();

  const [phase, setPhase] = useState<'hook' | 'rank' | 'result'>('hook');
  const [outcome, setOutcome] = useState<VerbOutcome | null>(null);

  const items = useMemo<RankItem[]>(
    () =>
      content.steps.map((s) => ({
        id: s.id,
        textKey: s.textKey,
        audioKey: s.audioKey,
        value: s.value,
        revealKey: s.revealKey,
        concepts: conceptMap(s.concepts),
        misconception: 'misconception' in s ? s.misconception : undefined,
      })),
    [],
  );

  const detail = outcome?.detail as RankDetail | undefined;
  const chance = detail ? recoveryChance(detail.accuracy, detail.elapsedMs) : 0;

  function finish() {
    const result = combine(content.summaryKey, [
      {
        choices: outcome?.choices ?? [],
        conceptDeltas: outcome?.conceptDeltas ?? {},
        misconceptions: outcome?.misconceptions ?? [],
        // The Help card is unlocked on the dashboard whatever the score: the
        // steps are safety information, not a reward to be withheld.
        effects: { 'meta.flags.hasHelpCard': true },
      },
    ]);
    onComplete(result);
  }

  if (phase === 'hook') {
    return (
      <section className="game game--safe10">
        <p>{t(content.hookKey)}</p>
        <button type="button" onClick={() => setPhase('rank')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'rank') {
    return (
      <Rank
        stepId="safe10.rank"
        ctx={ctx}
        items={items}
        direction="asc"
        costUnit="none"
        timed
        shuffle
        promptKey={content.promptKey}
        onComplete={(result) => {
          setOutcome(result);
          setPhase('result');
        }}
      />
    );
  }

  if (phase === 'result' && detail) {
    const perfect = detail.inversions === 0;
    const fast = detail.elapsedMs / 1000 <= content.recovery.fastSeconds;

    return (
      <section className="game game--safe10">
        <p>
          {perfect && fast
            ? t('safe10.result.fast')
            : perfect
              ? t('safe10.result.good_order')
              : t('safe10.result.wrong_order')}
        </p>

        <p>{t('safe10.result.chance', { percent: Math.round(chance * 100) })}</p>
        <p>{t(content.conceptCard.textKey)}</p>

        {/* The Help card, exactly as it will sit on the dashboard. */}
        <aside className="help-card">
          <h3>{t(content.helpCard.titleKey)}</h3>
          <ol>
            {content.helpCard.stepKeys.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ol>
          <p>{t(content.helpCard.footerKey)}</p>
        </aside>
        <p>{t('safe10.result.saved')}</p>

        <button type="button" onClick={finish}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  return null;
}
