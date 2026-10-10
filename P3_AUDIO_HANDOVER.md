# P3 Audio and Language Handover (from P5)

This file is for **P3**. It says what P5 has already built that touches audio and translation, what is still open, and exactly what P3 needs to do, so you can work on your own branch (`p3-paisapur`) without asking. Everything you need is in this file. Where something lives in the repo, the path is given.

Contents

1. [The short version](#1-the-short-version)
2. [What the "Read things aloud" setting is](#2-what-the-read-things-aloud-setting-is)
3. [What is done, by whom](#3-what-is-done-by-whom)
4. [What P3 needs to do](#4-what-p3-needs-to-do)
5. [How Stay Safe text reaches the screen (for placing audio)](#5-how-stay-safe-text-reaches-the-screen-for-placing-audio)
6. [Where audio files live and how they reach the phone](#6-where-audio-files-live-and-how-they-reach-the-phone)
7. [Translating Stay Safe text](#7-translating-stay-safe-text)
8. [Merging with P5's branch](#8-merging-with-p5s-branch)
9. [Rules that will fail your build](#9-rules-that-will-fail-your-build)
10. [Done when](#10-done-when)
11. [Open questions for P5 and P4](#11-open-questions-for-p5-and-p4)
12. [Appendix: Stay Safe text inventory](#12-appendix-stay-safe-text-inventory)

---

## 1. The short version

| Topic | Owner | State |
|---|---|---|
| `t(key)` translation loader (fallback, plurals, rupee format, RTL) | P3 | **Done on `p3-paisapur`**, not yet in `p5-dashboard` |
| Audio loader with text-to-speech fallback (`platform/audio`) | P3 | **Not started.** The file is an empty stub |
| Audio files, one per string | P3 | **Not started** |
| Read-aloud button in the UI (`AudioButton`) | P4 builds the component, P3 supplies the audio behind it | **Not started** |
| Translations of Stay Safe text into Telugu, Hindi, Urdu | P3 | **Not started.** The `te`, `hi`, `ur` folders are empty |
| The "audio" setting a student picks at setup | P5 | **Done.** Saved in the profile, readable with `useAccessibility()` |
| All Stay Safe text written as keys | P5 | **Done.** 811 English strings in `content/i18n/en/safe.json` |
| Storing downloaded language and audio packs on the phone | P5 | **Partly.** A table exists, no API yet (see section 6) |

The other three accessibility settings (bigger text, less movement, no timers) are done by P5 and need nothing from you.

---

## 2. What the "Read things aloud" setting is

On the second setup screen ("Make it easy for you") a student can tick four options. They are saved on the student's profile as `profile.a11y`:

| Setting | Key | What it does | Who builds it |
|---|---|---|---|
| Read things aloud | `audio` | The app speaks the text, for students who read slowly or not at all. A speaker button on each screen, and optionally automatic reading when a screen opens | **P3 (you)** |
| Bigger text | `largeText` | Letters about 25 percent larger across the whole app | P5, done |
| Less movement | `reduceMotion` | No animations: confetti, sliding banners, pulsing, counting numbers | P5, done |
| No timers | `timersOff` | Countdowns show but never run out | P5, done |

The type is in `frontend/src/platform/storage/db.ts`:

```ts
export type Accessibility = { audio: boolean; largeText: boolean; reduceMotion: boolean; timersOff: boolean };
```

To read the signed-in student's settings anywhere in the app:

```ts
import { useAccessibility } from '@/platform';
const { audio } = useAccessibility();   // false when nobody is signed in
```

(`useAccessibility` is in `frontend/src/platform/a11y/index.ts` on `p5-dashboard`.)

---

## 3. What is done, by whom

### 3.1 Done by P5 (branch `p5-dashboard`)

- **The `audio` setting** is chosen at setup and stored in the profile. Nothing reads it yet, because there is no audio.
- **All Stay Safe text is keys.** Nothing user-visible is hard-coded in a component. The English text is in `frontend/src/content/i18n/en/safe.json` (811 strings, about 6,600 words, 35,600 characters). Every key is loaded by the `t()` stub today and will be loaded by your loader.
- **Calls are shown as text.** Phone calls in The Call and the inbox appear as a transcript on screen, so the games work without sound. Audio is an addition, not a requirement.
- **Offline app.** The app saves its files on the phone so it opens with no internet (`frontend/vite.config.ts`, PWA section). Audio files are **not** in that cache yet (see section 6).
- **Fonts are bundled** for Latin script only (`@fontsource/ubuntu`). Telugu, Hindi and Urdu fall back to the phone's own fonts (see section 7).
- **Icon rules and a test** that fails on emoji (see section 9).

### 3.2 Done by P3 on `p3-paisapur`

I read your branch. These are already there:

- `frontend/src/platform/i18n/index.ts`: the real `t(key, vars)` loader, same signature as the stub. All four languages, per-key fallback to English, plurals through `Intl.PluralRules`, rupee formatting with `{amount, rupees}` giving Indian digit grouping, runtime language switching with subscribers, `registerStrings(language, flat)` for language packs, and `isRtl` / `direction` for Urdu.
- `tools/authoring/validate.mjs`: the content validator (keys exist, every English key exists in every shipped language, every `t()` call has a key).
- Lots of English bundles in `content/i18n/en/`.

### 3.3 Not done by anyone

- `frontend/src/platform/audio/index.ts` is `export {};`.
- No audio files, no `AudioButton` hooked to real audio.
- `content/i18n/te/`, `hi/`, `ur/` contain only `.gitkeep` on your branch.

---

## 4. What P3 needs to do

Work in this order. Each step is small enough to merge on its own.

### Step 1. Decide where the sound comes from

You have three options. They can be combined; the recommended path is the hybrid.

| Option | What it is | Pros | Cons |
|---|---|---|---|
| A. Device text-to-speech only | The browser reads the text aloud (`speechSynthesis`) | Zero files, works offline, instant for every string and every name or amount | Voice quality varies. **Telugu and Urdu voices are often missing on Android phones**, so test on real devices |
| B. Pre-made audio files | One recording per string (recorded or generated by a text-to-speech service) | Consistent, good quality, works on phones with no voice | Many files (see size below), must be hosted and cached, cannot say seeded names or amounts |
| **C. Hybrid (recommended)** | Pre-made files for fixed text, device speech for text with placeholders or when a file is missing | Best quality where it matters, nothing is ever silent | Two code paths |

Size to plan for, Stay Safe alone: about 6,600 words, which is about **47 minutes of speech per language** at a normal reading pace. Setup, home and PWA text add another 90 or so short strings.

### Step 2. Build `platform/audio`

The file is `frontend/src/platform/audio/index.ts` (Owner P3). The rest of the app imports only from `@/platform`, so export your API from there. Suggested API (change it if you want, but tell P5 and P4):

```ts
// What other code calls
export function audioEnabled(): boolean;                              // true when the student ticked "Read things aloud"
export function speak(text: string, opts?: { key?: string; language?: Language }): Promise<void>;
export function speakKey(key: string, vars?: Record<string, string | number>): Promise<void>;  // looks up the file for the key, falls back to speaking t(key, vars)
export function speakKeys(keys: string[], vars?: Record<string, string | number>): Promise<void>; // one message made of several keys, joined in order
export function stopSpeaking(): void;                                // always stop on navigation and when a new screen opens
export function hasAudio(key: string, language?: Language): boolean;
```

Behaviour rules:

1. Never speak unless the student's `audio` setting is on, **except** when they press a speaker button themselves (an explicit press always speaks).
2. Only one thing speaks at a time. Starting new speech stops the old one. Leaving a screen stops it.
3. Text-to-speech fallback with the Web Speech API:
   ```ts
   const voices = window.speechSynthesis.getVoices();         // this list loads asynchronously; wait for 'voiceschanged'
   const u = new SpeechSynthesisUtterance(text);
   u.lang = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN', ur: 'ur-PK' }[language];
   window.speechSynthesis.cancel();
   window.speechSynthesis.speak(u);
   ```
   If no voice exists for the language, show a small notice once ("Your phone has no voice for this language") instead of failing silently.
4. Browsers block sound until the student has tapped or pressed something on the page. So automatic reading only works after the first tap, which is fine because setup and the room start button are taps. Do not try to work around this.
5. Lazy load files. Never download audio for a language the student did not choose.

### Step 3. Build or finish the speaker button

P4's design kit lists an `AudioButton` component (`work_division.md`, P4 core components). It does not exist in the repo yet. Whoever builds it should:

- take either `keys` (an array, read as one message) or `text`, plus optional `vars`;
- show a speaker icon from the shared icon set (see section 9; for example add a `volume` icon to `frontend/src/ui/Icon.tsx` using Lucide's `Volume2`);
- show a "playing" state and stop on a second press;
- be at least 44 pixels tall (touch target).

### Step 4. Put the button where the text is

See section 5 for the exact components. Minimum useful set for Stay Safe:

1. The message or call that is on screen (the main thing a student must read).
2. The feedback card ("Correct! Well done" and the reason).
3. The room brief and the task list on the left of a room.
4. The "Remember" rule on the room summary.

When `audio` is on, also **auto-read** the message or call when a screen opens, then stop when the student leaves the screen. Do not auto-read feedback cards that appear a moment after an action in a way that cuts off the message the student is still hearing.

### Step 5. Handle names and amounts

Stay Safe fills in seeded names and amounts at play time ("Sunita M.", "₹2,000"). These **cannot be pre-recorded**. Two choices:

- Read the final sentence with device text-to-speech (easiest, works everywhere), or
- Pre-record the sentence with a placeholder and speak the number in words separately.

Use the first for now. Make sure Indian number words come out right in each language ("do hazaar", not "two zero zero zero"): format with your `{amount, rupees}` helper first, then speak the formatted text.

### Step 6. Translations

See section 7.

### Step 7. Cache the audio for offline use

See section 6.

---

## 5. How Stay Safe text reaches the screen (for placing audio)

Knowing this is the most useful thing for placing audio correctly.

### 5.1 One message is several keys joined together

A message body is a list of **segments**. Each segment is a separate text key, and the segments are shown one after another with **no separator**. Segment strings therefore often end with a space. Example (`content/scenarios/safe/templates/wrong_transfer.json` and `safe.json`):

```
safe.wt.chat.a = "Hi, I am very sorry. I sent ₹{amount} to your number by mistake. "
safe.wt.chat.b = "Please send it back to this number "
safe.wt.chat.c = "right now, I need it for my rent."
```

The student sees one message made of the three. **To read it aloud, join the segments in order, then speak the joined text.** Do not make one audio file per fragment, because the fragments are not sentences and will sound broken.

The segments are split like this so a part of the message can be inspected with the "Scam Lens" (the student taps "right now" and sees why it is a pressure tactic). Translators must keep the split and the trailing spaces (section 7).

### 5.2 The components that show text

All under `frontend/src/games/safe/`. Add the speaker button in these.

| What the student reads | File | Text source |
|---|---|---|
| SMS, chat, mail, call and page bodies | `phone/SurfaceView.tsx` calls `phone/apps/MessageViews.tsx`, `MailView.tsx`, `BrowserView.tsx`, `CallScreen.tsx`, `SearchView.tsx`, `PayApp.tsx` | `surface.body` or `surface.lines`, a list of `{ k: key }` segments |
| The in-call screen (the scam caller's words) | `phone/apps/CallScreen.tsx` (`IncomingCall`, `CallTranscript`) | `surface.lines` |
| Feedback after a choice | `phone/FeedbackCard.tsx` | title, note and "why" keys from the action and surface |
| What a Scam Lens tap reveals | `phone/Text.tsx` (`LensReading`) | `lens.revealKey` |
| Room title, brief, task list, hints | `phone/MissionPanel.tsx`, `phone/RoomParts.tsx` | `script.titleKey`, `script.briefKey`, objective `textKey`s, `safe.hint.*` |
| The rule to remember | `phone/RoomComplete.tsx` | `script.rule`, `script.instead[]` |
| Reward screen | `RewardScreen.tsx` | `safe.reward.*`, `safe.rank.*`, `safe.badge.*` |
| UPI Simulator screens | `upi-simulator/components/*` | `safe.upi.*` |
| Hub and catalogue | `SafeHub.tsx`, `catalog.ts` | `safe.hub.*` |

The shared function that turns a segment list into text is `RichText` in `phone/Text.tsx`. A small helper that returns the joined string for a surface (for example `surfaceText(surface, vars)`) would make audio easy; add it next to `surfacePreview` in `phone/SurfaceView.tsx`, which already builds a plain-text preview of a surface.

### 5.3 Where the values for placeholders come from

A scenario can carry `vars` (for example `{ name: 'Sunita M.', amount: '2,000' }`), built per play by `phone/logic/variants.ts`. They are passed to `t(key, vars)`. Your loader already handles `{placeholders}`.

### 5.4 Scenario content layout

```
frontend/src/content/scenarios/safe/
  *.json            static scripts (KYC message, customer care, loan app, rescue mission, red flag hunter)
  templates/*.json  scripts with {placeholders} (sent by mistake, hacked friend, digital arrest, collect request, QR)
  pools/*.json      the inbox message pool and the UPI check questions
frontend/src/content/i18n/en/safe.json   all the text, as nested keys under the `safe` namespace
```

Each text key is referenced from a scenario by its full name, for example `"k": "safe.wt.chat.a"`. The scenario format is documented in `frontend/src/games/safe/phone/logic/types.ts`.

---

## 6. Where audio files live and how they reach the phone

`frontend/src/content/README.md` says audio files are **not stored in git**, and that P3 decides where they live. Suggested design:

1. **Hosting:** a Supabase Storage bucket (public read), or the site's `public/audio/` folder for a small set. Name files by language and key, for example `audio/te/safe/wt/chat.mp3`, or per message for joined text (see 5.1), for example `audio/te/safe.wrong_transfer.chat.mp3`.
2. **Language packs (UC-PLAT-04, "download another language"):** a student on a phone with no internet downloads the Telugu pack once. Text (JSON) is small. Audio is large (about 47 minutes per language for Stay Safe), so offer audio as a **separate, optional download**.
3. **Storage on the phone:** P5 owns on-device storage. The local database already has a `contentMeta` table (`packId`, `version`, `updatedAt`) in `frontend/src/platform/storage/db.ts`, but there is **no API yet** for saving and loading a pack's files. Tell P5 the format you want (for example `saveContentPack(packId, version, files: Record<string, Blob>)` and `loadContentPack(packId)`), and P5 will add it. Audio files are better kept in the browser **Cache Storage** than in the database, because they are large binary files.
4. **Offline caching with the PWA:** the offline app only saves scripts, styles, fonts and icons at build time (`vite.config.ts`, `globPatterns`). Audio is fetched later, so add a runtime caching rule next to the existing one:
   ```ts
   {
     urlPattern: ({ url }) => url.pathname.startsWith('/audio/'),
     handler: 'CacheFirst',
     options: { cacheName: 'audio', expiration: { maxEntries: 400 }, rangeRequests: true }
   }
   ```
   Ask P5 before editing `vite.config.ts` or send them the rule.

---

## 7. Translating Stay Safe text

The English source is `frontend/src/content/i18n/en/safe.json`. Create `te/safe.json`, `hi/safe.json` and `ur/safe.json` with **exactly the same keys**. Your validator already checks that every English key exists in every shipped language.

### Rules for translators (give these to whoever translates)

1. **Keep every `{placeholder}` exactly as written** (`{name}`, `{amount}`, `{payee}`, `{item}`, `{buyer}`, `{officer}`, `{newbal}`, `{what}`, `{n}`, `{total}`, `{pct}`, `{s}`, `{rank}`). 34 strings have placeholders.
2. **Keep the segment split and the spaces.** 40 strings end with a space because they are joined to the next segment. Keep the trailing space and keep the split between segments, even if the grammar would prefer a different order. If a language needs a different word order across segments, tell P5 so the scenario can be changed.
3. **Do not translate the names and the amounts.** Names such as "Rohit" and "Vikram S." come from the game and are not in the text files. Sender codes such as `AX-BNKUPD` are in the scenario files, not the text files, and are meant to be left as they are.
4. **Do not translate brand-like words with real brands.** There are none; the fake apps are called "QuickPay", "QuickCash Loan" and so on, and should stay in Latin letters.
5. **Keep it short and plain.** The audience is students who may read slowly. Prefer short sentences.
6. **Scam wording must still feel like a scam.** Fake messages, calls and ads must read like the real kind (urgent, a bit pushy), or the lesson is lost. The "why this is a scam" text must be clear and calm.
7. **Numbers and money:** use your rupee formatter for any amount you add. In text that already has `₹{amount}`, keep it.

### Right-to-left (Urdu)

Your loader sets `document.documentElement.dir = 'rtl'` for Urdu. Stay Safe's screens were **not** built RTL-first. Many layouts use left and right classes (for example `ml-auto`, `text-left`, `border-l-4`, `lg:border-r`). To make them correct in RTL, switch them to logical properties (`ms-auto`, `text-start`, `border-s-4`, `border-e`) in the Stay Safe components and the phone. Decide with P4 who does this, because P4's design kit is meant to provide "RTL-safe utilities".

### Fonts

Only Latin script is bundled. Telugu, Devanagari (Hindi) and Urdu (Nastaliq) will fall back to whatever the phone has, which is often poor or missing. Add bundled fonts, for example `@fontsource/noto-sans-telugu`, `@fontsource/noto-sans-devanagari` and `@fontsource/noto-nastaliq-urdu`, import only the weights you use in `frontend/src/main.tsx`, and check the offline app size (they are added to the offline cache automatically).

---

## 8. Merging with P5's branch

Your branch `p3-paisapur` was created from an older commit (`0ff5461`). `p5-dashboard` has 23 commits on top of it, and more are coming. Bring them into your branch before you finish, so you build on the same code:

```bash
git fetch origin
git checkout p3-paisapur
git merge origin/p5-dashboard
```

Files that will probably conflict, and how to resolve them:

| File | Why | Resolve by |
|---|---|---|
| `frontend/src/platform/index.ts` | P5 added `export * from './a11y'` (and the sync engine export lives in `./sync`) | Keep both sides. Add your audio export too |
| `frontend/src/platform/i18n/index.ts` | You replaced the stub. P5 did not change it | Take yours |
| `frontend/src/content/i18n/en/setup.json`, `home.json` | Both sides edited | Keep both sets of keys. P5 changed some `home` labels ("XP" is now "Points") |
| `frontend/src/ui/index.ts` | P5 added `export { Icon, type IconName } from './Icon'` | Keep it |
| `frontend/src/app/router.tsx` | P5 added the Stay Safe routes and hid the `/dev` pages in production builds | Keep both |
| `frontend/src/main.tsx` | P5 added offline app and sync startup, font imports | Keep both |
| `frontend/src/index.css` | P5 added room styles, confetti, large-text and reduced-motion rules | Keep both |
| `frontend/vite.config.ts`, `package.json`, `package-lock.json` | P5 added offline caching, `lucide-react`, `@fontsource/*` | Keep both, then run `npm install` |
| `TEAM_GUIDE.md` | P5 added the icon rule | Keep it |

After merging, run `npm install`, then `npx tsc -b`, `npm run lint`, `npm test`, `npm run build`.

---

## 9. Rules that will fail your build

These tests run with `npm test`. They will fail on your branch after you merge `p5-dashboard`, so know them now.

1. **No emoji and no text symbols as icons.** `frontend/src/test/icons.test.ts` scans every source and content file. Emoji in a `.tsx`, `.ts`, `.json` (including `content/i18n/**`) or `.css` file fails the test. Arrows, crosses, plus signs and bullets typed as text also fail. Use `<Icon name="..." />` from `@/ui` (Lucide icons). To add an icon, import it in `frontend/src/ui/Icon.tsx` only and give it a name. **If your existing strings contain emoji, remove them or replace them.**
2. **Lucide only through `ui/Icon.tsx`.** Do not import `lucide-react` or any other icon library anywhere else.
3. **Folder import rules** (`npm run lint`): `core/` and every `logic/` folder must be pure (no React, no storage, no `@/platform`, no `@/ui`). `ui/` must not import features or games. App code imports only from `@/platform`, never `@/platform/<subfolder>`.
4. **Every key must exist.** `frontend/src/games/safe/phone/scenarios.test.ts` fails if a Stay Safe scenario uses a text key that is missing from `safe.json`.
5. **Student-visible text goes through `t()`.** No hard-coded English in components.

---

## 10. Done when

- A student who ticked "Read things aloud" can press a speaker button on a message, a call, a feedback card and a room brief, and hear it. A student who did not tick it hears nothing unless they press the button.
- Reading stops when the student moves to another screen.
- It works with no internet for text-to-speech, and for downloaded audio packs once they are cached.
- Telugu, Hindi and Urdu have `safe.json` translations with all keys and placeholders intact; the validator passes.
- Urdu screens are right-to-left and readable. Telugu and Hindi display with a proper bundled font.
- On a real low-end Android phone: all four languages are tested, and any language with no device voice shows a notice instead of silence.
- `npm run lint`, `npm test`, `npm run build` pass after merging `p5-dashboard`.

---

## 11. Open questions for P5 and P4

1. **P5:** what format do you want for `saveContentPack` and `loadContentPack` for downloaded language and audio packs? P5 will add the API once you answer.
2. **P5:** should reading start automatically when a message or call opens, if the student ticked the setting? Recommended yes, with a clear "stop" button. Confirm with the facilitators' feedback if you can.
3. **P4:** who builds `AudioButton` and the Urdu-safe layout utilities?
4. **P3 and P5:** should the scam caller in The Call have a voice? Recommended: a plain, neutral voice, never a cloned or real person's voice. Keep the call text on screen too.
5. **P3:** which languages get pre-recorded audio first? Telugu is the plan's first language after English.

---

## 12. Appendix: Stay Safe text inventory

Snapshot of `frontend/src/content/i18n/en/safe.json` (811 strings). Counts are keys per top-level group under `safe`. It will grow, so re-run the count when you start.

| Group | Keys | What it is |
|---|---|---|
| `ui` | 90 | Labels and messages used across the rooms |
| `hub` | 61 | The Stay Safe home: simulator names, descriptions, levels, progress |
| `reward` | 19 | Reward screen, ranks, points |
| `rank` | 5 | Level names |
| `badge` | 24 | Achievement names and descriptions |
| `fb` | 25 | Feedback titles, cheers, and the reasons for each kind of answer |
| `hint` | 7 | "How to do this" hints under each task |
| `verdict`, `tell`, `summary` | 20 | Legit/Suspicious/Scam labels, the seven red-flag cards, run summaries |
| `kyc01`, `inbox01`, `inbox`, `pool`, `whatif` | 131 | Fake KYC, Red Flag Hunter, Scam Inbox messages and what would have happened |
| `collect01`, `qr01`, `wt`, `upi` | 168 | UPI Simulator: collect request, scan to receive, sent by mistake, the full walkthrough and quiz |
| `hf`, `da`, `cc`, `ln`, `rm` | 261 | Hacked friend, digital arrest call, fake customer care, loan app trap, rescue mission |

Placeholders in use: `{amount}`, `{n}`, `{total}`, `{what}`, `{item}`, `{payee}`, `{name}`, `{buyer}`, `{newbal}`, `{officer}`, `{pct}`, `{rank}`, `{s}`.

Other bundles that also need audio and translation (P5 wrote these; they are small):

- `content/i18n/en/setup.json` (42 strings): language, accessibility, class code, avatar, picture-PIN. **These are the first screens a student sees, so they matter most for audio.**
- `content/i18n/en/home.json` (44 strings): the student dashboard.
- `content/i18n/en/pwa.json` (8 strings): the offline and install messages.

Suggested audio priority:

1. Setup screens (`setup.json`). A student who cannot read must be able to finish setup.
2. The text of the message or call on screen in each Stay Safe room.
3. The feedback card (the reason is the lesson).
4. Room briefs, tasks and the "Remember" rule.
5. The rest.

---

*Written by P5. Questions: ask P5 in the team chat, or open an issue on the repository. If anything in this file does not match the code on your branch after you merge, the code wins; tell P5 so this file can be corrected.*
