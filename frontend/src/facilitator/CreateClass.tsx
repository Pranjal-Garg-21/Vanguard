/** UC-FAC-01: create a class, confirm consent, get a join code. */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, Card, Notice } from '@/ui';
import { LANGUAGE_NAMES, supabaseOrThrow } from './data';

const CONSENT_ITEMS = [
  'Parents or guardians have been informed by the NGO and have given consent.',
  'Students may use these devices (their own or shared) for the sessions.',
  'Students know the app uses nicknames only and never asks about their real money or family.',
];

export function CreateClass({ ngoId }: { ngoId: string | null }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [centre, setCentre] = useState('');
  const [language, setLanguage] = useState('te');
  const [size, setSize] = useState('');
  const [consent, setConsent] = useState<boolean[]>(CONSENT_ITEMS.map(() => false));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allConsented = consent.every(Boolean);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabaseOrThrow()
      .from('classes')
      .insert({
        name: name.trim(),
        centre: centre.trim() || null,
        language,
        expected_size: size ? Number(size) : null,
        ngo_id: ngoId,
        consent_confirmed: true,
      })
      .select('id')
      .single();
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? 'Could not create the class.');
      return;
    }
    // Land on the join code and QR sheet, which is what the facilitator needs next.
    navigate(`../class/${data.id}?tab=join`, { replace: true });
  };

  const input = 'mt-1 w-full rounded-lg border border-line-strong bg-bg p-3 focus:border-brand focus:outline-none';

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link to=".." className="text-sm font-semibold text-brand">
        ← Your classes
      </Link>
      <h1 className="text-2xl font-extrabold">New class</h1>

      <form onSubmit={submit} className="space-y-5">
        <Card className="space-y-4">
          <label className="block">
            <span className="font-semibold">Class name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Grade 11 · Batch A" className={input} />
          </label>
          <label className="block">
            <span className="font-semibold">School or centre</span>
            <input value={centre} onChange={(e) => setCentre(e.target.value)} placeholder="Old City Learning Centre" className={input} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-semibold">Default language</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={input}>
                {Object.entries(LANGUAGE_NAMES).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-semibold">Expected students</span>
              <input type="number" min={1} max={200} value={size} onChange={(e) => setSize(e.target.value)} placeholder="40" className={input} />
            </label>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">Before students join</h2>
          {CONSENT_ITEMS.map((item, i) => (
            <label key={item} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-brand"
                checked={consent[i]}
                onChange={(e) => setConsent(consent.map((v, j) => (j === i ? e.target.checked : v)))}
              />
              <span className="text-ink-soft">{item}</span>
            </label>
          ))}
        </Card>

        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim() || !allConsented}>
          {busy ? 'Creating…' : 'Create class and get join code'}
        </Button>
      </form>
    </div>
  );
}
