import { t } from '@/platform';
import { AudioButton, Button, Card, SectionLabel } from '@/ui';
import { foundKinds, summarise } from './logic/scoring';
import { TELL_KINDS, type RunState } from './logic/types';
import { TellCard } from './TellCard';
import { rupees } from './apps/PayApp';
import { Confetti } from './Confetti';
import { Icon } from './Icon';

function Stat({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

/** Completion screen in the style of a finished room: result, stats and the red-flag cards. */
export function RoomComplete({ state, collected = [], onReplay, onRetry, onContinue }: { state: RunState; /** Cards found in earlier rooms. */ collected?: string[]; onReplay: () => void; onRetry: () => void; onContinue: () => void }) {
  const sum = summarise(state);
  const found = new Set(foundKinds(state));
  const judge = state.script.mode === 'judge';
  const inbox = sum.handledTotal > 0;
  const fooled = sum.outcome === 'fooled';

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      {!fooled && <Confetti trigger={1} count={60} />}
      <div className="text-center">
        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${fooled ? 'bg-warn/15 text-warn' : 'bg-brand/15 text-brand'}`}><Icon name={fooled ? 'alert' : 'shield'} className="h-8 w-8" /></span>
        <h1 className={`mt-3 text-3xl font-bold ${fooled ? 'text-warn' : 'text-brand'}`}>{fooled ? t('safe.ui.failed') : t('safe.ui.done')}</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">{t(judge ? 'safe.summary.judge' : fooled ? 'safe.summary.fooled' : 'safe.summary.safe')}</p>
      </div>

      <div className={`grid gap-3 ${inbox ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {judge && <Stat label={t('safe.ui.judgedRight')} value={`${sum.judgedRight}/${sum.judgedTotal}`} tone="text-brand" />}
        {inbox && <Stat label={t('safe.ui.handled')} value={`${sum.handledSafely}/${sum.handledTotal}`} tone="text-brand" />}
        {inbox && <Stat label={t('safe.ui.falseAlarms')} value={String(sum.falseAlarms)} tone={sum.falseAlarms > 0 ? 'text-warn' : 'text-brand'} />}
        {!judge && <Stat label={t('safe.ui.moneyLost')} value={rupees(sum.balanceLost)} tone={sum.balanceLost > 0 ? 'text-bad' : 'text-brand'} />}
        <Stat label={t('safe.ui.tellsFound')} value={`${sum.tellsFound}/${sum.tellsTotal}`} tone="text-info" />
        <Stat label={t('safe.ui.cards')} value={`${new Set([...found, ...collected]).size}/${TELL_KINDS.length}`} tone="text-xp" />
      </div>

      {state.script.rule && (
        <Card className="space-y-3 border-brand/40">
          <div className="flex items-center gap-2">
            <SectionLabel>{t('safe.ui.remember')}</SectionLabel>
            <AudioButton keys={[state.script.rule, ...(state.script.instead ?? [])]} className="-my-2 ms-auto h-9 w-9 text-ink-soft" />
          </div>
          <p className="text-lg font-bold leading-snug text-ink">{t(state.script.rule)}</p>
          {state.script.instead && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">{t('safe.ui.doInstead')}</p>
              <ul className="space-y-1.5">
                {state.script.instead.map((k) => (
                  <li key={k} className="flex items-start gap-2 text-sm text-ink-soft">
                    <Icon name="check" className="mt-0.5 h-4 w-4 text-brand" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {(fooled || sum.balanceLost > 0) && (
        <div className="rounded-lg border-s-4 border-bad bg-surface p-4">
          <h2 className="font-bold text-ink">{t('home.help.title')}</h2>
          <p className="text-sm text-ink-soft">{t('home.help.body')}</p>
        </div>
      )}

      <Card>
        <SectionLabel>{t('safe.ui.cards')}</SectionLabel>
        <p className="mb-3 mt-1 text-sm text-muted">{t('safe.ui.cardsHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TELL_KINDS.map((k) => <TellCard key={k} kind={k} found={found.has(k)} collected={collected.includes(k)} isNew={found.has(k) && !collected.includes(k)} />)}
        </div>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={onReplay}>{t('safe.ui.replay')}</Button>
        <Button variant="secondary" onClick={onRetry}>{t('safe.ui.restart')}</Button>
        <Button size="lg" onClick={onContinue}>{t('safe.ui.continue')}</Button>
      </div>
    </div>
  );
}
