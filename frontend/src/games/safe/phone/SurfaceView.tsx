/** Draws one surface by type. Used by the live phone and by the replay. */
import { t } from '@/platform';
import { ChatView, SmsView } from './apps/MessageViews';
import { MailView } from './apps/MailView';
import { CallTranscript } from './apps/CallScreen';
import { BrowserView } from './apps/BrowserView';
import { PayRequestView } from './apps/PayApp';
import type { Surface } from './logic/types';
import type { ViewProps } from './Text';

export function SurfaceBody({ surface, view }: { surface: Surface; view: ViewProps }) {
  switch (surface.type) {
    case 'sms':
      return <SmsView surface={surface} view={view} />;
    case 'chat':
      return <ChatView surface={surface} view={view} />;
    case 'mail':
      return <MailView surface={surface} view={view} />;
    case 'call':
      return <CallTranscript surface={surface} view={view} />;
    case 'page':
      return <BrowserView surface={surface} view={view} />;
    case 'pay-request':
      return <PayRequestView surface={surface} view={view} />;
    case 'permission':
      return (
        <div className="p-4 text-phone-ink">
          <p className="text-xs font-bold uppercase tracking-wider text-phone-muted">{t(surface.appKey)}</p>
          <p className="mt-2 font-semibold">{t(surface.askKey)}</p>
        </div>
      );
  }
}

/** Which app an item lives in. */
export const APP_OF: Record<Surface['type'], 'messages' | 'chat' | 'mail' | 'phone' | 'pay' | 'browser' | 'system'> = {
  sms: 'messages',
  chat: 'chat',
  mail: 'mail',
  call: 'phone',
  'pay-request': 'pay',
  page: 'browser',
  permission: 'system',
};

/** One-line label for lists, banners and the activity log. */
export function surfaceTitle(s: Surface): string {
  switch (s.type) {
    case 'sms':
      return s.from;
    case 'chat':
      return s.from;
    case 'mail':
      return s.fromName;
    case 'call':
      return s.caller;
    case 'pay-request':
      return s.fromName;
    case 'page':
      return t(s.titleKey);
    case 'permission':
      return t(s.appKey);
  }
}

export function surfacePreview(s: Surface, vars?: Record<string, string | number>): string {
  const segs = 'body' in s ? s.body : 'lines' in s ? s.lines : [];
  if (s.type === 'mail') return t(s.subjectKey);
  if (s.type === 'pay-request') return `₹${s.amount.toLocaleString('en-IN')}`;
  return segs.map((x) => t(x.k, vars)).join('').slice(0, 70);
}
