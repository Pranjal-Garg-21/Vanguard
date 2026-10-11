/**
 * The Help and Feedback screens of the Start menu.
 *
 * Help is also what a new player sees first: how to move, what to do and how the game teaches. Feedback says how
 * the year is going and what is worth another look, so playing and learning are not two separate things.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CONCEPTS } from '@/core/story/content';
import { needsCost, emergencyFund, type LifeState } from '@/core/engine';
import { t } from '@/platform';
import { rupees } from './logic/format';

/** What the objective means in practice: where to go and the steps open to the player right now. */
function useGuide(life: LifeState): { where: string; steps: string[] } | null {
  const id = life.objective.replace(/^objective\./, '');
  const base = `paisapur.guide.${id}`;
  const n = Number(t(`${base}.n`));
  if (!Number.isInteger(n) || n < 1) return null;
  return { where: t(`${base}.where`), steps: Array.from({ length: n }, (_, i) => t(`${base}.step${i + 1}`)) };
}

export function Help({ life, place }: { life: LifeState; place?: string }) {
  const chapter = Math.min(6, life.chapter);
  const guide = useGuide(life);
  const savingForGoal = life.objective === 'objective.new_goal' ? Math.round((life.pot / Math.max(1, life.goal.target)) * 100) : null;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-base">{t('paisapur.help.welcome')}</p>

      <Section title={t('paisapur.help.nowTitle')}>
        <p className="font-bold">{t(life.objective)}</p>
        {place && <p className="mt-1 text-[#3a4a6b]">{t('paisapur.help.youAreIn', { place })}</p>}
        {guide ? (
          <>
            <p className="mt-2">
              <span className="font-bold">{t('paisapur.help.whereTitle')}: </span>
              {guide.where}
            </p>
            <p className="mt-2 font-bold">{t('paisapur.help.stepsTitle')}</p>
            <ol className="list-decimal space-y-1 ps-5">
              {guide.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </>
        ) : (
          <p className="mt-1">{t('paisapur.help.generic')}</p>
        )}
        {savingForGoal !== null && <p className="mt-2 font-bold">{t('paisapur.help.goalProgress', { pct: savingForGoal })}</p>}
        <p className="mt-2">
          <span className="font-bold">{t('paisapur.help.tipTitle')}: </span>
          {t(`paisapur.help.tip.${chapter}`)}
        </p>
      </Section>

      <Section title={t('paisapur.help.controlsTitle')}>
        <ul className="list-disc space-y-1 ps-5">
          {(['move', 'talk', 'back', 'menu'] as const).map((k) => (
            <li key={k}>{t(`paisapur.help.${k}`)}</li>
          ))}
        </ul>
      </Section>

      <Section title={t('paisapur.help.goalTitle')}>
        <p>{t('paisapur.help.goal')}</p>
      </Section>

      <Section title={t('paisapur.help.learnTitle')}>
        <p>{t('paisapur.help.learn')}</p>
      </Section>

      <Section title={t('paisapur.help.moreTitle')}>
        <p>{t('paisapur.help.moreBody')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ['/learn', 'lessons'],
              ['/simulations', 'simulations'],
              ['/minigames', 'minigames'],
            ] as const
          ).map(([to, key]) => (
            <Link key={key} to={to} className="rounded bg-[#3a4a6b] px-3 py-1.5 font-bold text-white">
              {t(`paisapur.help.${key}`)}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function Feedback({ life }: { life: LifeState }) {
  const seen = CONCEPTS.filter((c) => life.journal[c.id]).length;
  const mastered = CONCEPTS.filter((c) => life.journal[c.id] === 'mastered').length;
  const toReview = CONCEPTS.filter((c) => life.journal[c.id] === 'seen').slice(-5);
  const months = Math.floor(emergencyFund(life) / Math.max(1, needsCost(life)));
  const recent = life.ledger.slice(-5).reverse();

  return (
    <div className="space-y-3 text-sm">
      <Section title={t('paisapur.feedback.meters')}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <Row label={t('paisapur.hud.cash')} value={rupees(life.cash)} />
          <Row label={t('paisapur.hud.bank')} value={rupees(life.bank.balance + life.pot)} />
          <Row label={t('paisapur.hud.fund_months')} value={String(months)} />
          <Row label={t('paisapur.hud.peace')} value={`${Math.round(life.peace)}`} />
        </dl>
      </Section>

      <Section title={t('paisapur.feedback.ideas')}>
        <p className="font-bold">{t('paisapur.feedback.ideasCount', { seen, mastered })}</p>
        <p className="mt-2 font-bold">{t('paisapur.feedback.toReview')}</p>
        {toReview.length === 0 ? (
          <p>{t('paisapur.feedback.allGood')}</p>
        ) : (
          <>
            <p>{t('paisapur.feedback.toReviewBody')}</p>
            <ul className="mt-1 list-disc space-y-0.5 ps-5">
              {toReview.map((c) => (
                <li key={c.id}>{t(`concepts.${c.id}.title`)}</li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title={t('paisapur.feedback.recent')}>
        {recent.length === 0 ? (
          <p>{t('paisapur.feedback.recentNone')}</p>
        ) : (
          <ul className="space-y-0.5">
            {recent.map((e, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{t(`paisapur.reason.${e.reason.split(':')[0]}`)}</span>
                <span className={e.amount < 0 ? 'font-bold text-red-700' : 'font-bold text-green-700'}>{rupees(e.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t('paisapur.feedback.next')}>
        <p>{t(life.objective)}</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded bg-white p-2">
      <h3 className="mb-1 text-sm font-bold text-[#3a4a6b]">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className="text-end font-bold tabular-nums">{value}</dd>
    </>
  );
}
