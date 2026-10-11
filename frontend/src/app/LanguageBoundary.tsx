/**
 * Redraws the whole app when the language changes. Most screens call t() directly, which does not re-render a
 * component by itself, so changing the key here remounts everything below and every string is read again.
 * Screen state that matters is saved by the games, and the router keeps the current page.
 */
import type { ReactNode } from 'react';
import { useLanguage } from '@/platform';

export function LanguageBoundary({ children }: { children: ReactNode }) {
  const language = useLanguage();
  return <div key={language} className="contents">{children}</div>;
}
