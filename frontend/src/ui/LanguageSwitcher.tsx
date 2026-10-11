/**
 * Four buttons, one per language, each written in its own script so a student can find theirs without reading English.
 * Changes the signed-in student's language (saved on their profile), or just the screen when nobody is signed in yet.
 * Owner: P4. Part of the design kit.
 */
import { getLanguage, setLanguage, setProfileLanguage, t, useActiveProfile, useLanguage, type Language } from '@/platform';
import { cn } from '@/lib/utils';

const CHOICES: { id: Language; native: string; english: string }[] = [
  { id: 'en', native: 'English', english: 'English' },
  { id: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { id: 'te', native: 'తెలుగు', english: 'Telugu' },
  { id: 'ur', native: 'اردو', english: 'Urdu' },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const current = useLanguage();
  const profile = useActiveProfile((s) => s.profile);

  const choose = (id: Language) => {
    if (id === getLanguage()) return;
    if (profile) void setProfileLanguage(profile.pid, id);
    else setLanguage(id);
  };

  return (
    <div role="group" aria-label={t('ui.language')} className={cn('inline-flex overflow-hidden rounded-lg border border-line-strong text-sm font-bold', className)}>
      {CHOICES.map((c) => (
        <button
          key={c.id}
          type="button"
          lang={c.id}
          aria-pressed={c.id === current}
          title={c.english}
          onClick={() => choose(c.id)}
          className={cn('min-h-9 px-2.5 transition-colors', c.id === current ? 'bg-primary text-primary-foreground' : 'bg-secondary text-ink-soft hover:text-primary')}
        >
          {c.native}
        </button>
      ))}
    </div>
  );
}
