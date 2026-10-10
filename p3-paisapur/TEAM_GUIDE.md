# PaisaPath Team Guide

Everything built so far, how to run it, and how to add your own work. Read this first, then `REPO_STRUCTURE.md` for the full folder map.

---

## Contents

1. [Quick start](#1-quick-start)
2. [What exists today](#2-what-exists-today)
3. [The three parts of the repo](#3-the-three-parts-of-the-repo)
4. [Where your work goes](#4-where-your-work-goes)
5. [Platform API (save, load, log, profiles)](#5-platform-api-save-load-log-profiles)
6. [How to add things](#6-how-to-add-things)
7. [Rules the linter enforces](#7-rules-the-linter-enforces)
8. [Backend and Supabase](#8-backend-and-supabase)
9. [Git workflow](#9-git-workflow)
10. [Stubs to replace](#10-stubs-to-replace)
11. [FAQ](#11-faq)

---

## 1. Quick start

Requires **Node 20.19+** (22 recommended).

```bash
git pull
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

The app works **without any keys**. To connect to Supabase (needed only for the facilitator pages and the class-code check), create `frontend/.env.local` with the values your P5 shares privately:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key, sb_publishable_...>
```

Restart `npm run dev` after changing it. Never commit this file; it is git-ignored.

| Command (in `frontend/`) | What it does |
|---|---|
| `npm run dev` | Runs the app with hot reload |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | Lint, including folder import rules |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build (same as CI) |

Run `npm run typecheck && npm run lint && npm test` before opening a pull request.

---

## 2. What exists today

### Pages you can open

| URL | What it is | Status |
|---|---|---|
| `/` | Sends a student to welcome, the player picker or home | ✅ Working |
| `/welcome` | Welcome screen | ✅ Working |
| `/setup` | First launch: language → accessibility → class code → avatar + nickname → picture-PIN | ✅ Working |
| `/who` | "Who's playing?" grid on a shared phone, picture-PIN unlock, 30 s lockout after 3 wrong tries | ✅ Working |
| `/join/ABC123` | Link inside the class QR; opens setup with the code filled in | ✅ Working |
| `/home` | Student home with tiles marked "Coming soon" | ⚠️ Temporary, P2 replaces it |
| `/facilitator` | Facilitator email sign-in, class list, create class, join code + QR, plan, insights | ✅ Working (needs Supabase) |
| `/dev` | Developer page: Supabase status, sync badge, last events in the outbox, "Log test event" | 🛠️ Dev only |

### Built and working

- **Project scaffold:** Vite + React 19 + TypeScript (strict) + Tailwind 4, React Router, Zustand, Dexie, PWA plugin, Vitest, oxlint, CI.
- **Phone storage** (IndexedDB): profiles, saves, snapshots, outbox, settings, all kept separate per player.
- **Profiles:** create, list, picture-PIN (stored only as a hash), lockout, switch player.
- **`logEvent()`:** records what a student did, validates it (no free text), and puts it in the outbox.
- **Facilitator dashboard:** reads and writes Supabase directly.
- **Database:** 7 tables with row-level security (each facilitator sees only their own classes), join-code generator, class-code check.
- **`ingest` server function:** written, not deployed yet (see §8).
- **Folders for every feature, game and verb**, each with an owner tag.

### Not built yet

| Piece | Owner |
|---|---|
| Real game types (`GameState`, `Persona`), engine, event tape, LifePath, runtime, home dashboard | P2 |
| Character builder, mastery model, rewind, Quick Play, progress | P1 |
| Everyday Money games, verbs (Allocate, Commit, Triage, Rank), real translations | P3 |
| Design kit, investing games, market engine, Predict verb | P4 |
| Sync from phones to Supabase (Phase 8), fake phone, UPI Simulator, Scam Inbox | P5 |

---

## 3. The three parts of the repo

```
frontend/   Everything in the browser: the student app + /facilitator dashboard
backend/    Everything in the cloud: Supabase tables, access rules, server function
shared/     Code both sides use: the event format and sync protocol
```

Inside `frontend/src/`:

| Folder | What goes there |
|---|---|
| `app/` | Router, app shell, temporary home |
| `core/` | **Pure** game logic: no React, no storage, no network |
| `platform/` | The **only** code that touches IndexedDB, the network or Supabase |
| `ui/` | Shared visual components |
| `runtime/` | ModuleRunner and the 8 verbs |
| `features/` | Full screens that aren't mini-games |
| `games/` | Mini-games, one folder each |
| `facilitator/` | Teacher dashboard |
| `content/` | JSON: scenarios, strings, concepts, prompts |
| `test/` | Test setup and fixtures |

Import aliases: `@/…` means `frontend/src/…`, and `@shared/…` means `shared/…`.

---

## 4. Where your work goes

Every folder already exists with an `index.ts` that names its owner.

### P1: Persona, Progress & Time Travel
- `core/persona/`: `classify(answers)`, `generateInitialState(persona, seed)`
- `core/mastery/`: mastery model and thresholds
- `core/timeline/`: snapshots, branches, replay
- `features/onboarding/character-builder/`, `features/onboarding/checks/`
- `features/rewind/timeline/`, `compare/`, `year-end/`
- `features/quickplay/`, `features/progress/mastery-map/`, `features/progress/badges/`
- `content/onboarding/`
- Save snapshots with `saveSnapshot()` / `listSnapshots()` from `@/platform`.

### P2: Core Engine & LifePath
- **First:** finalise `core/types/index.ts` (everyone depends on it).
- `core/engine/`, `core/random/`, `core/lifepath/`
- `runtime/` (ModuleRunner) and `runtime/verbs/choose/`
- `features/lifepath/month/`, `stage-gate/`, `story/`; `features/home/` (replace `app/StudentHome.tsx`)
- `games/registry.ts`, `app/router.tsx`
- `content/stages/`, `content/scenarios/lifepath/`, `content/concepts.json`
- Call `setTelemetryContext({ mode, stage, lifeStage, timeline, level })` whenever these change.

### P3: Everyday Money & Content Pipeline
- `games/everyday/`: `document-hunt`, `bank-counter`, `swipe-sort`, `jar-split`, `goal-builder`, `spending-detective`, `surprise-month`, `debt-ladder`, `rescue-mission`
- `runtime/verbs/allocate/`, `commit/`, `triage/`, `rank/`
- `platform/i18n/` (replace the stub, keep `t()`), `platform/audio/`
- `content/i18n/{en,te,hi,ur}/`, `content/schemas/`, `content/scenarios/{bank,plan,save,borrow}/`

### P4: Investing, Design Kit & Investment Scams
- `ui/`: starter `Button`, `Card`, `Badge`, `Notice`, `Spinner` exist; restyle or replace (keep names and props, or update callers). Tokens go in `src/index.css`.
- `core/market/`
- `games/investing/`: `chai-price`, `compounding-garden`, `time-machine`, `stock-market`, `mutual-fund`, `invest-or-scam`
- `runtime/verbs/predict/`, `features/arcade/`
- `content/assumptions.json`, `content/scenarios/invest/`

### P5: Stay Safe, Platform & Facilitator
- `platform/` (except i18n, audio), `features/setup/`, `facilitator/`
- `games/safe/phone/`, `upi-simulator/`, `scam-inbox/`
- `runtime/verbs/judge/`, `act-in-situ/`
- `backend/`, `shared/`, CI

---

## 5. Platform API (save, load, log, profiles)

Import everything from `@/platform`. Never import Dexie or Supabase directly.

### Logging what a student did

```ts
import { logEvent } from '@/platform';

await logEvent({
  activity: 'UC-SAFE-01',          // use case ID
  concept: 'upi_collect',          // from concepts.json
  choice: 'entered_pin',           // choice ID, never free text
  correct: false,
  misconception: 'pin_needed_to_receive', // optional
});
```

The platform fills in the player, class, stage, timeline and time. IDs must be short and code-like (letters, digits, `_ . : -`, up to 64 characters); anything else is rejected. Events wait in the outbox until sync (Phase 8) sends them.

For a finished mini-game, P2's runtime will call:

```ts
await logResult(miniGameResult, { activity: 'UC-PB-02', concept: 'budgeting' });
```

### Saving and loading

```ts
import { getActiveProfile, saveGame, loadGame, getSetting, setSetting } from '@/platform';

const profile = await getActiveProfile();         // { pid, displayName, avatarId, language, a11y, classCode, classStatus }
await saveGame(profile!.pid, 'lifepath', state);  // any JSON-safe data
const state = await loadGame<GameState>(profile!.pid, 'lifepath');

await setSetting(profile!.pid, 'lastScreen', 'month-4');
```

| Function | Use |
|---|---|
| `saveGame(pid, slot, data)` / `loadGame(pid, slot)` | Save and resume |
| `saveSnapshot(s)` / `listSnapshots(pid, timelineId?)` | Rewind checkpoints (P1) |
| `getSetting(scope, key)` / `setSetting(scope, key, value)` | Settings per player (`scope = pid`) or device (`DEVICE_SCOPE`) |
| `storageHealth()` | Space used, and whether the browser promised not to delete data |

### Profiles

| Function / hook | Use |
|---|---|
| `useActiveProfile()` | React hook: `{ profile, loaded }` |
| `getActiveProfile()` / `loadActiveProfile()` | Current player (async) |
| `listProfiles()` | Players on this phone |
| `createProfile(…)`, `unlockProfile(pid, pictures)`, `switchPlayer()` | Used by setup and the player picker |

Accessibility settings are on `profile.a11y`: `{ audio, largeText, reduceMotion, timersOff }`. **Respect `timersOff`**: show timers but never let them run out.

### Other

| Function / hook | Use |
|---|---|
| `t('namespace.key', { name: 'Sana' })` | Translated text (stub returns English) |
| `useSyncStatus()` | `{ state, pending, lastSyncAt }` for a sync badge |
| `setTelemetryContext({...})` | P2 sets stage, mode, timeline, level |

### UI components

```ts
import { Button, Card, Badge, Notice, Spinner } from '@/ui';

<Button size="lg" variant="primary">Next</Button>   // variants: primary, secondary, ghost, danger
<Card>…</Card>
<Badge tone="good">Unlocked</Badge>                  // tones: neutral, good, warn, bad, info
<Notice tone="info">…</Notice>                        // tones: warn, bad, info
```

---

## 6. How to add things

### A mini-game

1. Your game folder already exists, e.g. `games/everyday/jar-split/`. Use `games/example/` as the pattern:
   ```
   games/everyday/jar-split/
   ├── index.ts          export the MiniGame
   ├── JarSplit.tsx      top-level component
   ├── components/       screens used only by this game
   └── logic/            pure logic + *.test.ts
   ```
2. Export a `MiniGame` from `index.ts` (contract in `core/types/index.ts`):
   ```ts
   export const jarSplit: MiniGame = {
     id: 'jar-split',
     verbs: ['allocate'],
     concepts: ['needs_wants', 'budgeting'],
     levels: [1, 2],
     async play(ctx) { /* … */ return result; },
   };
   ```
3. Add it to the `games` array in `games/registry.ts`.
4. Put its content in `content/scenarios/<pillar>/jar-split.json`.
5. Put pure rules and scoring in `logic/` with tests next to them.

### A screen and route

1. Create the component in your `features/<name>/` folder.
2. Add a route in `app/router.tsx`:
   ```tsx
   { path: '/progress', element: <MasteryMap /> },
   ```

### Text and translations

1. Add strings to `content/i18n/en/<namespace>.json`:
   ```json
   { "title": "Your progress", "streak": "{days} day streak" }
   ```
2. Use them as `t('<namespace>.title')`, `t('<namespace>.streak', { days: 3 })`. The namespace is the file name.
3. Never write user-visible text directly in components (the facilitator dashboard is English-only for now).

### Concepts and misconceptions

Add IDs to `content/concepts.json` (P2 reviews). Use snake_case, e.g. `upi_collect`, `pin_needed_to_receive`.

### Tests

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestProfile, resetDb } from '@/test/fixtures';

beforeEach(resetDb);

it('logs a choice', async () => {
  await createTestProfile();
  // …your code that calls logEvent / saveGame …
});
```

Tests get a real in-memory IndexedDB automatically, so platform functions just work.

---

## 7. Rules the linter enforces

`npm run lint` fails if you break these:

| In these folders | You may NOT import | Why |
|---|---|---|
| `core/**` and any `logic/**` | React, Dexie, Supabase, `@/platform`, `@/ui`, `@/app`, `@/features`, `@/games`, `@/runtime`, `@/facilitator` | Logic stays pure, replayable and testable |
| `ui/**` | Dexie, Supabase, `@/app`, `@/features`, `@/games`, `@/runtime`, `@/facilitator` | Components stay presentational |
| `app/`, `features/`, `games/`, `runtime/` | Dexie, Supabase, `@/platform/<subfolder>` | Use `@/platform` only |

Also agreed (not linted):
- A game never imports another game; use `games/registry.ts`.
- No real bank, app, fund, company or brand names anywhere.
- Never ask about or store a student's real money, family or messages.
- Student-visible text goes through `t()`.

---

## 8. Backend and Supabase

The backend is a hosted Supabase project. Nothing to run locally. Full details are in `backend/README.md`.

### One-time setup (P5 does this)

1. In **SQL Editor**, run each file in `backend/supabase/migrations/` once, in filename order:
   1. `20261010000000_init.sql`: tables, join codes, row-level security
   2. `20261010000001_check_join_code.sql`: class-code check for setup
2. **Authentication → URL Configuration:** add `http://localhost:5173/**` to Redirect URLs.
3. **Authentication → Sign In / Providers:** turn off "Allow new users to sign up".

### Tables

| Table | Holds | Who can read |
|---|---|---|
| `ngos` | NGOs | Its facilitators |
| `facilitators` | Registered teachers (linked to their login) | Themselves |
| `classes` | Class name, centre, language, join code, focus | Its facilitator |
| `players` | Pseudonymous student ID, nickname, last sync | Their class's facilitator |
| `events` | Every recorded answer (same shape as `shared/telemetry/event.ts`) | Their class's facilitator |
| `unlocks` | Stages and Arcade sections opened per class | Its facilitator |
| `class_concept_daily` | Daily red/amber/green summaries (filled later) | Its facilitator |

Students never log in to Supabase. Their phones will send events through the `ingest` function once sync is built.

### Facilitator access

No shared accounts. To give someone dashboard access:
1. **Authentication → Users → Add user** with their email.
2. In SQL Editor:
   ```sql
   insert into public.facilitators (id, display_name)
   select id, 'Their name' from auth.users where email = 'them@example.com';
   ```
3. They open `/facilitator`, enter their email, and click the link in the email.

### Keys

| Key | Where | Share? |
|---|---|---|
| Project URL, publishable key | `frontend/.env.local` | Yes, privately with the team |
| Secret key, database password | `backend/.env` (P5 only) | **Never** |

### Changing the database

Never edit a migration that has already been run. Add a new file in `backend/supabase/migrations/` with a higher number (e.g. `20261012000000_add_grade.sql`) and tell P5 to run it.

---

## 9. Git workflow

1. Branch from `main`: `git checkout -b p3/jar-split`
2. Commit small, clear changes.
3. Before pushing: `npm run typecheck && npm run lint && npm test`
4. Open a pull request to `main`. CI runs the same checks.
5. Changes to shared files (`core/types`, `concepts.json`, `platform/`, `ui/`, `shared/`, `router.tsx`, `registry.ts`) need a review from their owner.
6. Never commit `.env`, `.env.local` or keys.

Branch names: `p<number>/<short-topic>`, e.g. `p1/mastery-model`, `p4/design-tokens`.

---

## 10. Stubs to replace

These have the final name and shape but placeholder insides. Build against them now; the owner swaps in the real version.

| Stub | File | Owner | What's missing |
|---|---|---|---|
| `GameState`, `Persona`, `EffectMap` | `core/types/index.ts` | P2 | Real shapes (currently `Record<string, unknown>`) |
| `t()` | `platform/i18n/index.ts` | P3 | Other languages, plurals, ₹ formatting, RTL layout |
| `syncNow()` | `platform/sync/index.ts` | P5 | Upload to Supabase (Phase 8) |
| Starter components | `ui/components.tsx` | P4 | Real design kit |
| Student home | `app/StudentHome.tsx` | P2 | Real dashboard in `features/home/` |
| `games/example/` | | P5 | Delete once real games are registered |
| Emoji avatars and PIN pictures | `features/setup/pictures.ts` | P4 | Illustrations |

---

## 11. FAQ

**The app says "Supabase: not configured".**
`frontend/.env.local` is missing or wrong. Check the file name and restart `npm run dev`. Everything except the facilitator pages and class-code check works without it.

**How do I reset my local data (profiles, saves)?**
Browser DevTools → Application → Storage → Clear site data. Or open a private window.

**How do I see the events my game logged?**
Open `/dev`. It lists the latest events in the outbox.

**Lint says an import is restricted.**
You're importing something your folder isn't allowed to (see §7). Move the logic into `logic/` or `core/`, or import from `@/platform` instead of a subfolder.

**My class code says "We couldn't find that code".**
The class doesn't exist in Supabase, or the SQL hasn't been run. "You're offline" means it can't check right now and will confirm later.

**The facilitator email link opens the wrong page.**
`http://localhost:5173/**` isn't in Supabase's Redirect URLs (§8).

**Where is the full plan?**
`Implementation.md` (product spec), `work_division.md` (who does what), `REPO_STRUCTURE.md` (folders and rules), `P5_implementation.md` (P5's phases).
