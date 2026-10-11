/** UC-FAC-01: create a class, confirm consent, get a join code. */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { LANGUAGE_NAMES, supabaseOrThrow } from './data';
import { BackLink, Hero, lime, Notice, Panel } from './theme';

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

  const input = 'mt-2 w-full rounded-md border border-[#d5dbe5] bg-white p-3 text-[#111827] placeholder:text-[#9aa3b2] [color-scheme:light] focus:border-[#1c2538] focus:ring-2 focus:ring-[#a3e635] focus:outline-none';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink to="..">Your classes</BackLink>
      <Hero tone="lime" title="New class" body="Name it, pick the language, and you’ll get a join code and QR to share." />

      <form onSubmit={submit} className="space-y-6">
        <Panel icon="school" title="Class details" subtitle="Students see the class name when they join.">
          <div className="space-y-5">
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
          </div>
        </Panel>

        <Panel icon="check" title="Before students join" subtitle="Tick all three to create the class.">
          <div className="space-y-4">
          {CONSENT_ITEMS.map((item, i) => (
            <label key={item} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-[#65a30d]"
                checked={consent[i]}
                onChange={(e) => setConsent(consent.map((v, j) => (j === i ? e.target.checked : v)))}
              />
              <span className="text-[#3b4558]">{item}</span>
            </label>
          ))}
          </div>
        </Panel>

        {error && <Notice tone="bad">{error}</Notice>}
        <button type="submit" className={`${lime} min-h-12 w-full text-lg`} disabled={busy || !name.trim() || !allConsented}>
          {busy ? 'Creating…' : 'Create class and get join code'}
        </button>
      </form>
    </div>
  );
}
