/**
 * Developer gallery at /dev/phone: every static phone script as a card,
 * playable with timers on or off, with the MiniGameResult it hands back.
 * Students use /safe instead. Owner: P5.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { t } from '@/platform';
import type { MiniGameResult } from '@/core/types';
import { Badge, Button, Card, Icon, Notice, SectionLabel } from '@/ui';
import { PhoneRoom } from './PhoneRoom';
import { SingleMessage } from './SingleMessage';
import { getScenario, listScenarios } from './scenarios';

const LEVEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' } as const;

export function PhoneLab() {
  const [id, setId] = useState<string | null>(null);
  const [single, setSingle] = useState(false);
  const [timersOff, setTimersOff] = useState(false);
  const [result, setResult] = useState<MiniGameResult | null>(null);
  const script = id ? getScenario(id) : undefined;

  if (script) {
    const done = (r: MiniGameResult) => {
      setResult(r);
      setId(null);
      setSingle(false);
    };
    return single ? (
      <div className="p-4 pt-10"><SingleMessage script={script} timersOff={timersOff} mode="lifepath" onResolve={done} /></div>
    ) : (
      <PhoneRoom script={script} timersOff={timersOff} onComplete={done} />
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <div>
        <Link to="/dev" className="inline-flex items-center gap-1 text-sm font-bold text-brand"><Icon name="back" className="h-4 w-4" />/dev</Link>
        <h1 className="mt-2 text-3xl font-bold text-ink">Phone lab</h1>
        <p className="text-ink-soft">Every static phone script, playable. Generated games (UPI, inbox day) are in the student hub at <Link className="text-brand underline" to="/safe">/safe</Link>.</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={timersOff} onChange={(e) => setTimersOff(e.target.checked)} /> {t('safe.ui.timersOff')}
      </label>
      <SectionLabel>{t('safe.ui.room')}</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        {listScenarios().map((s) => (
          <Card key={s.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={s.level === 1 ? 'good' : 'warn'}>{LEVEL[s.level]}</Badge>
              <Badge>{s.mode === 'judge' ? 'Judge' : 'Act in-situ'}</Badge>
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">{t(s.titleKey)}</h2>
              <p className="mt-1 text-sm text-muted">{t(s.briefKey)}</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button onClick={() => { setResult(null); setSingle(false); setId(s.id); }}>{t('safe.ui.playRoom')}</Button>
              {s.mode === 'act' && <Button variant="secondary" onClick={() => { setResult(null); setSingle(true); setId(s.id); }}>{t('safe.ui.singleMessage')}</Button>}
            </div>
          </Card>
        ))}
      </div>
      {result && (
        <div className="space-y-2">
          <Notice tone="info">The MiniGameResult handed back to the runtime:</Notice>
          <pre className="overflow-x-auto rounded-lg border border-line bg-black/40 p-3 font-mono text-xs text-ink-soft">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}
