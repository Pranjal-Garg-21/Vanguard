# P3 — Reading aloud and languages

Answers to the audio and language handover, and what is now on `p3-paisapur`.
`npm run typecheck && npm run lint && npm test && npm run build` pass, and
`node tools/authoring/validate.mjs` is clean (three warnings, all of them "no
translations yet").

---

## Try it

```bash
cd frontend && npm install && npm run dev
```

Open any Stay Safe room (`/safe`). Speaker buttons sit on the room title, each
task hint, the message or call on the phone, the feedback card and the rule to
remember. Press one and the phone reads it out. Setup (`/setup`) has one on
every step.

To hear a screen read itself when it opens, tick **Read things aloud** during
setup. Nothing speaks on its own otherwise.

---

## What was decided, and why

### The sound comes from the phone, with recordings optional

Option C from the handover, built so option B can be added one key at a time.
`speakKey('safe.ui.ok')` plays `/audio/<language>/<file>` if a manifest says
there is a recording for that key, and reads the text with the phone's own
voice if there is not. Nothing is ever silent on a phone with no pack.

No recordings exist yet, and the code does not need any to work. When they
arrive, drop a `manifest.json` next to them mapping key to file name and call
`loadAudioManifest(language)`; the service worker keeps every clip that has
been heard once (`vite.config.ts`, the `/audio/` rule).

Two rules run through all of it:

- **Pressing the button always speaks.** The "Read things aloud" setting
  controls what the app does on its own, not what a student asks for. The app
  only reads a screen by itself when the setting is on, and not before the
  student's first tap, because browsers refuse to make a sound until then.
- **One voice at a time.** Starting something new stops the old one, and
  leaving a screen stops it. Two voices over each other are worse than none.

### A message is read whole, never in fragments

`safe.wt.chat.a/b/c` is one message split so the Scam Lens can point at "right
now". The fragments are not sentences, so `surfaceText()` (next to
`surfacePreview` in `phone/SurfaceView.tsx`) joins them, and `surfaceClipKey()`
names a single recording for the whole message — `safe.kyc01.sms`, from the
prefix its segments share. Recording the fragments would sound broken, so
nothing in the code makes that easy.

### Names and amounts are spoken, not recorded

Option 1 from the handover. A string containing a `{placeholder}` never plays a
recording, even if one is registered: the recording cannot know this month's
amount. `t()` formats first, so "₹2,000" reaches the voice as a rupee amount
with Indian grouping, not as four digits.

### The API, slightly changed from the handover

```ts
audioEnabled(): boolean
speak(text, { id?, clipKey?, language? }): Promise<void>
speakKey(key, vars?): Promise<void>
speakKeys(keys[], vars?, clipKey?): Promise<void>   // joined into one sentence
autoSpeakKey / autoSpeakKeys / autoSpeak            // obey the setting, for the app
stopSpeaking(): void
hasAudio(key, language?): boolean
loadAudioManifest(language) / registerAudioManifest(language, files)
onAudioNotice(handler)                              // "no voice for this language"
nowSpeaking() / subscribeToSpeech()                 // for the button's playing state
useSpeaking() / useReadAloud(keys, vars?, clipKey?) // React
```

Two differences from the handover's sketch, both deliberate:

- `speakKeys` takes a `clipKey` for the whole message, for the reason above.
- The `speak*` family is split from an `autoSpeak*` family rather than every
  call checking `audioEnabled()`. A caller that forgets the check is the bug
  this prevents: a screen that talks at a student who never asked.

All of it is exported from `@/platform`. Tests stand in for the browser with
`setSpeechEngine` and `setClipPlayer`; `resetAudio()` puts a fresh phone back.

### The language a student chose is now actually used

This was not in the handover, and it was a real gap: `profile.language` was
written at setup and never read, so the app was English whatever a student
picked. `followProfileLanguage()` (called once in `main.tsx`) makes every
screen follow whoever is signed in, and setup switches the moment a language is
picked so screen two is already in it.

A language with no strings on the device is still refused rather than showing a
screen of raw keys (UC-PLAT-04), so **this is invisible until the three packs
are translated** — and then it lights up with no further work.

### Fonts are bundled, and the CDN links are gone

`index.html` fetched Pixelify Sans and Ubuntu from Google Fonts, which the
offline app cannot guarantee (§14.4). Pixelify now ships with the app. Telugu,
Devanagari and Nastaliq are about 250 KB together, so they are **not** in the
install: `src/app/fonts.ts` fetches a language's font the first time that
language is chosen, and the service worker keeps it. Precache dropped from
1834 KiB to 1513 KiB.

The trade-off worth knowing: a phone that has never been online and picks
Telugu will use the system font until it next connects. Picking a language
happens on a fresh install, which by definition just came off the network, so
in practice this is the same session.

---

## Translating

The strings are in `frontend/src/content/i18n/en/*.json` — 2,819 of them now,
not only Stay Safe's 811.

```bash
node tools/authoring/strings-export.mjs te translations/te.tsv   # hand this to a translator
node tools/authoring/strings-import.mjs te translations/te.tsv --dry-run
node tools/authoring/strings-import.mjs te translations/te.tsv
node tools/authoring/validate.mjs
```

The sheet is tab-separated (the strings are full of commas; none contains a
tab) with `key`, `english`, `translation`, `notes`. The notes column calls out
the 226 strings with a `{placeholder}` and the 40 that end with a space because
they are one piece of a joined message.

The importer refuses a sheet that would break a screen rather than writing it:

- a row that drops or renames a `{placeholder}` is an error, and **nothing is
  written** — the whole import stops;
- a trailing space eaten by the spreadsheet is put back, and reported;
- a key that is not in the English files is reported and skipped;
- a plural form English does not have (Urdu may want "few") is accepted, as
  long as its siblings exist.

It writes one file per namespace in the English layout, so `te/safe.json` can
be diffed against `en/safe.json` line for line.

The round trip is proven end to end: exported, filled in, imported, and the
validator accepted the result. What is missing is human translators — nothing
in this repo should machine-translate 2,819 strings that children will read.

---

## Right-to-left

`setLanguage` sets `document.documentElement.dir`, and the Stay Safe screens,
the phone and the shared design kit now use logical properties (`ms-auto`,
`text-start`, `border-s-4`, `rounded-se-sm`, `end-2`, `lg:border-e`) instead of
left and right, so they mirror in Urdu. The built CSS emits
`margin-inline-start` and friends.

Still physical, and not P3's to change: `features/paisapur` (P2),
`features/landing` and `features/home` (P5), `facilitator` (P5, English-only,
so it does not matter).

---

## Answers to the open questions

**P5 — the format for `saveContentPack` / `loadContentPack`.** Two kinds, and
they want different storage:

```ts
saveStringPack(language: Language, files: Record<string, unknown>): Promise<void>
loadStringPack(language: Language): Promise<Record<string, unknown> | null>
```

Strings are small JSON and belong in Dexie; feed what comes back to
`registerStrings(language, flat)`. Audio is large binary and belongs in Cache
Storage, not IndexedDB — the service worker rule already keeps anything fetched
from `/audio/`, so a "download the Telugu voice" button only has to fetch the
manifest and then fetch each file once. No new API needed for that.

**P5 — should reading start automatically?** Yes, and it does, when the student
ticked the setting. It stops on leaving a screen, and the same button stops it
mid-sentence.

**P4 — who builds `AudioButton`?** Built, in `src/ui/AudioButton.tsx`, 44 px
tall, plain SVG, no emoji, with a `playing` state. Restyle it freely; the only
contract is that it takes `keys` (or `text`) and `vars`.

**P4 — the RTL-safe utilities.** Done for Stay Safe and `src/ui` (above).

**P3 and P5 — should the scam caller have a voice?** Yes, the phone's own
neutral voice, never a cloned or real person's. The call text stays on screen
either way, so the room is playable in silence.

**P3 — which language gets recordings first?** Telugu, after English, matching
the plan. Setup first, then the message or call in each room, then the feedback
card: a student who cannot read has to be able to finish setup before the
read-aloud setting exists on their profile.

---

## What changed in other people's files

Small, and each for a reason:

- `platform/profiles`: `followProfileLanguage()`, and the module now imports
  i18n.
- `platform/a11y`: new, the `useAccessibility()` the handover promised. It was
  not on the branch.
- `platform/sync/sync.test.ts`: the two offline tests only passed on a machine
  with a `.env.local`, because the badge reads "disabled" without one. They now
  pin the env, so CI agrees with a laptop.
- `content/concepts.json`: Stay Safe's `loan_app` and `authority_impersonation`
  were renamed to the story's existing `loan_app_trap` and `impersonation` —
  two ids for one idea would have split a student's mastery. Its six genuinely
  new concepts are registered with Journal entries, and marked `"game": "safe"`
  so the story's "every concept is taught" test only asks about its own.
- `content/scenarios/safe/rescue-mission.json` moved to
  `scenarios/protect/`. Stay Safe globs its folder, so it was swallowing the
  Everyday Money game of the same name and crashing on a shape it did not know.
- `index.html`, `vite.config.ts`, `main.tsx`: fonts and the `/audio/` cache
  rule.
- Stay Safe components: speaker buttons and logical properties.
