/**
 * Facilitator login with email: a sign-in link, or a 6-digit code if the
 * email template includes it. No public sign-up.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Icon, type IconName } from '@/ui';
import { supabaseOrThrow } from './data';
import { lime, Notice } from './theme';

const FEATURES: { icon: IconName; text: string }[] = [
  { icon: 'target', text: 'See which money ideas your class finds hardest' },
  { icon: 'chat', text: 'Get discussion prompts for the top misconceptions' },
  { icon: 'flag', text: 'Unlock stages and set the focus for each session' },
];

/** The digits of whatever was typed or pasted, at most the 8 a sign-in code can have. */
const digitsOf = (text: string) => text.replace(/\D/g, '').slice(0, 8);

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseOrThrow().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/facilitator` },
    });
    setBusy(false);
    if (error) {
      setError(
        /signup|not allowed|not found/i.test(error.message)
          ? 'This email isn’t registered as a facilitator. Ask your NGO admin to add you.'
          : error.message,
      );
      return;
    }
    setSent(true);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseOrThrow().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError('That code didn’t work. Check it, or request a new one.');
  };

  return (
    <div className="grid min-h-dvh bg-[#eef1f6] font-[Ubuntu,ui-sans-serif,system-ui] text-[#1c2538] lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#1c2538] text-white lg:flex lg:items-center">
        <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute -left-40 top-1/2 h-[70%] overflow-visible -translate-y-1/2">
          <circle cx="0" cy="100" r="150" fill="#22382a" />
          <circle cx="0" cy="100" r="115" fill="#3f6b2f" />
          <circle cx="0" cy="100" r="80" fill="#a3e635" />
        </svg>
        <div className="relative ml-auto max-w-md px-12 py-16">
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium tracking-wide text-[#c8d0de] uppercase">PaisaPath · Facilitator</span>
          <h2 className="mt-5 text-4xl leading-tight font-bold">Run your class. See what clicks.</h2>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-3 text-[#c8d0de]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#a3e635] text-[#14240b]">
                  <Icon name={f.icon} className="h-4 w-4" />
                </span>
                <span className="pt-1">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#a3e635] text-xl font-bold text-[#14240b]">P</div>
          <h1 className="mt-5 text-3xl font-bold">Facilitator sign in</h1>
          <p className="mt-2 text-[#5b6577]">Run your class, unlock stages and see what your students understand.</p>
        </div>

        <section className="rounded-xl border border-[#e3e8ef] bg-white p-6 shadow-sm sm:p-8">
          {!sent ? (
            <form onSubmit={sendCode} className="space-y-4">
              <label className="block">
                <span className="font-semibold">Email</span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ngo.org"
                  className="mt-2 w-full rounded-md border border-[#d5dbe5] bg-white p-3 text-[#111827] placeholder:text-[#9aa3b2] [color-scheme:light] focus:border-[#1c2538] focus:ring-2 focus:ring-[#a3e635] focus:outline-none"
                />
              </label>
              {error && <Notice tone="bad">{error}</Notice>}
              <button type="submit" className={`${lime} w-full`} disabled={busy || !email}>
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <Notice tone="info">
                We emailed <strong>{email}</strong>. Open the link on this device, or enter the code from the email.
              </Notice>
              <label className="block">
                <span className="font-semibold">Code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  // "one-time-code" makes some browsers fill and clear the box as you type, so the code is kept off it.
                  autoComplete="off"
                  autoFocus
                  maxLength={32}
                  value={code}
                  onChange={(e) => setCode(digitsOf(e.target.value))}
                  onPaste={(e) => {
                    // A pasted code often carries spaces or line breaks; keep only the digits.
                    e.preventDefault();
                    setCode(digitsOf(e.clipboardData.getData('text')));
                  }}
                  placeholder="123456"
                  className="mt-2 w-full rounded-md border border-[#d5dbe5] bg-white p-3 text-[#111827] placeholder:text-[#9aa3b2] [color-scheme:light] text-center font-mono text-2xl tracking-widest focus:border-[#1c2538] focus:ring-2 focus:ring-[#a3e635] focus:outline-none"
                />
              </label>
              {error && <Notice tone="bad">{error}</Notice>}
              <button type="submit" className={`${lime} w-full`} disabled={busy || code.length < 6}>
                {busy ? 'Checking…' : 'Sign in'}
              </button>
              <button type="button" className="w-full text-sm font-semibold text-[#2563eb] hover:underline" onClick={() => setSent(false)}>
                Use a different email
              </button>
            </form>
          )}
        </section>

        <p className="mt-6 text-sm">
          <Link to="/" className="inline-flex items-center gap-1 font-semibold text-[#2563eb] hover:underline">
            <Icon name="arrowLeft" className="h-4 w-4" />
            Back to the student app
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
