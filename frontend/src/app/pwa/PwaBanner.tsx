/**
 * A small bar at the bottom of the screen about the offline app. It is
 * never in the way: one message at a time, and each can be dismissed.
 */
import { useState } from 'react';
import { t } from '@/platform';
import { Button } from '@/ui';
import { applyUpdate, installApp } from './index';
import { bannerFor, remember, remembered, REMEMBER_KEYS, usePwa } from './state';

export function PwaBanner() {
  const state = usePwa();
  const [dismissed, setDismissed] = useState({ offlineReady: remembered(REMEMBER_KEYS.offline), install: remembered(REMEMBER_KEYS.install) });
  const kind = bannerFor(state, dismissed);
  if (!kind) return null;

  const dismiss = (what: 'offlineReady' | 'install') => {
    remember(what === 'install' ? REMEMBER_KEYS.install : REMEMBER_KEYS.offline);
    setDismissed((d) => ({ ...d, [what]: true }));
  };

  const text = {
    update: t('pwa.needRefresh'),
    offlineReady: t('pwa.offlineReady'),
    offline: t('pwa.offline'),
    install: t('pwa.installBody'),
    ios: t('pwa.iosHint'),
  }[kind];

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 print:hidden">
      <div className="flex w-full max-w-xl flex-wrap items-center gap-3 rounded-xl border border-line-strong bg-surface-2 p-3 text-sm text-ink shadow-xl">
        <span className="min-w-0 flex-1">{text}</span>
        {kind === 'update' && <Button className="!min-h-9" onClick={applyUpdate}>{t('pwa.update')}</Button>}
        {kind === 'install' && (
          <>
            <Button className="!min-h-9" onClick={() => void installApp()}>{t('pwa.install')}</Button>
            <Button variant="ghost" className="!min-h-9" onClick={() => dismiss('install')}>{t('pwa.dismiss')}</Button>
          </>
        )}
        {kind === 'ios' && <Button variant="ghost" className="!min-h-9" onClick={() => dismiss('install')}>{t('pwa.dismiss')}</Button>}
        {kind === 'offlineReady' && <Button variant="ghost" className="!min-h-9" onClick={() => dismiss('offlineReady')}>{t('pwa.dismiss')}</Button>}
      </div>
    </div>
  );
}
