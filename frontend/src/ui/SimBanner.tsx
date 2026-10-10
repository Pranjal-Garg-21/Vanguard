/**
 * The fixed guardrail banner shown on every investing screen.
 * Owner: P4. Part of the design kit.
 */
import { t } from '@/platform';
import { Notice } from './components';

export function SimBanner() {
  return (
    <div role="note">
      <Notice tone="warn">
        <span className="font-bold text-warn">Note: </span>
        {t('investui.banner')}
      </Notice>
    </div>
  );
}
