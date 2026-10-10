/**
 * The fixed guardrail banner shown on every investing screen.
 * Owner: P4. Part of the design kit.
 */
import { t } from '@/platform';

export function SimBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
    >
      <span aria-hidden="true">ⓘ</span>
      <span>{t('investui.banner')}</span>
    </div>
  );
}
