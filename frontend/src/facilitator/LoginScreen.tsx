/**
 * Facilitator login with email: a sign-in link, or a 6-digit code if the
 * email template includes it. No public sign-up.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button, Card, Alert } from '@/ui';
import { supabaseOrThrow } from './data';

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
    <div className="flex min-h-dvh items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-brand text-2xl font-bold text-brand-ink">P</div>
          <h1 className="mt-4 text-2xl font-extrabold">Facilitator sign in</h1>
          <p className="mt-1 text-ink-soft">Run your class, unlock stages and see what your students understand.</p>
        </div>

        <Card>
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
                  className="mt-1 w-full rounded-lg border border-line-strong bg-bg p-3 focus:border-brand focus:outline-none"
                />
              </label>
              {error && <Alert variant="bad">{error}</Alert>}
              <Button type="submit" className="w-full" disabled={busy || !email}>
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <Alert variant="info">
                We emailed <strong>{email}</strong>. Open the link on this device, or enter the code from the email.
              </Alert>
              <label className="block">
                <span className="font-semibold">Code</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="123456"
                  className="mt-1 w-full rounded-lg border border-line-strong bg-bg p-3 text-center font-mono text-2xl tracking-widest focus:border-brand focus:outline-none"
                />
              </label>
              {error && <Alert variant="bad">{error}</Alert>}
              <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
                {busy ? 'Checking…' : 'Sign in'}
              </Button>
              <button type="button" className="w-full text-sm font-semibold text-brand" onClick={() => setSent(false)}>
                Use a different email
              </button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="font-semibold text-brand underline">
            ← Back to the student app
          </Link>
        </p>
      </div>
    </div>
  );
}
