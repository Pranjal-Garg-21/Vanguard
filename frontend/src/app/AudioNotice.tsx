/**
 * Says so when the phone has no voice for the language in use. Owner: P3.
 *
 * Without this, pressing "Read this to me" on a Telugu screen on a phone with
 * no Telugu voice would do nothing at all, and the student would be left
 * wondering whether the button or their tap was broken.
 */
import { useEffect, useState } from 'react';
import { onAudioNotice, t } from '@/platform';
import { Button } from '@/ui';

export function AudioNotice() {
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    onAudioNotice(() => setShowing(true));
    return () => onAudioNotice(null);
  }, []);

  if (!showing) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 print:hidden">
      <div className="flex w-full max-w-xl flex-wrap items-center gap-3 rounded-xl border border-line-strong bg-surface-2 p-3 text-sm text-ink shadow-xl">
        <span className="min-w-0 flex-1">{t('readaloud.noVoice')}</span>
        <Button variant="ghost" className="!min-h-9" onClick={() => setShowing(false)}>
          {t('pwa.dismiss')}
        </Button>
      </div>
    </div>
  );
}
