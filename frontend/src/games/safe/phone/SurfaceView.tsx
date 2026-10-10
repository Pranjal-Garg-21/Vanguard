/** Draws one surface by type. Used by the live phone and by the replay. */
import { t } from '@/platform';
import { ChatView, SmsView, type Earlier } from './apps/MessageViews';
import { MailView } from './apps/MailView';
import { CallTranscript } from './apps/CallScreen';
import { BrowserView } from './apps/BrowserView';
import { PayRequestView } from './apps/PayApp';
import { SearchView } from './apps/SearchView';
import type { Surface } from './logic/types';
import type { ViewProps } from './Text';

export function SurfaceBody({ surface, view, earlier, saidNow, typing }: { surface: Surface; view: ViewProps; earlier?: Earlier; saidNow?: string; typing?: boolean }) {
  switch (surface.type) {
    case 'sms':
      return <SmsView surface={surface} view={view} />;
    case 'chat':
      return <ChatView surface={surface} view={view} earlier={earlier} saidNow={saidNow} typing={typing} />;
    case 'mail':
      return <MailView surface={surface} view={view} />;
    case 'call':
      return <CallTranscript surface={surface} view={view} />;
    case 'page':
      return <BrowserView surface={surface} view={view} />;
    case 'pay-request':
      return <PayRequestView surface={surface} view={view} />;
    case 'search':
      return <SearchView surface={surface} view={view} />;
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
  search: 'browser',
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
    case 'search':
      return s.query;
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
  if (s.type === 'search') return '';
  return segs.map((x) => t(x.k, vars)).join('').slice(0, 70);
}

/**
 * The keys of a surface's message, in reading order. Owner: P3.
 *
 * A body is split into segments so the Scam Lens can point at part of it, and
 * the segments are not sentences on their own ("Please send it back " is one),
 * so anything reading a message aloud has to join them.
 */
export function surfaceKeys(s: Surface): string[] {
  const keys: string[] = [];
  if (s.type === 'mail') keys.push(s.subjectKey);
  if (s.type === 'page') keys.push(s.titleKey);
  if (s.type === 'permission') keys.push(s.appKey, s.askKey);
  if ('body' in s) keys.push(...s.body.map((x) => x.k));
  if ('lines' in s) keys.push(...s.lines.map((x) => x.k));
  if (s.type === 'pay-request') keys.push(s.noteKey);
  return keys;
}

/** A surface's message as one sentence, with names and amounts filled in. */
export function surfaceText(s: Surface, vars?: Record<string, string | number>): string {
  return surfaceKeys(s)
    .map((k) => t(k, vars))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The name a recording of this whole message would have: the text keys of a
 * message share a prefix, so "safe.kyc01.sms.a" and its siblings become
 * "safe.kyc01.sms". Recording the fragments separately would sound broken, so
 * there is one clip per message.
 */
export function surfaceClipKey(s: Surface): string | undefined {
  const first = surfaceKeys(s)[0];
  if (!first) return undefined;
  const parts = first.split('.');
  return parts.length > 2 ? parts.slice(0, -1).join('.') : first;
}
