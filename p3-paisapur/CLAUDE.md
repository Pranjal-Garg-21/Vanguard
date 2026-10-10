# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PaisaPath is an offline-first PWA that teaches financial literacy to Grade 11–12 students in Hyderabad by having them live a fictional character's money life month by month (ECell Megathon 2026, Vanguard India brief). Built by a 5-person team (P1–P5).

The main game is **Paisapur**, a top-down tile RPG (classic handheld style) where the student walks a town, enters buildings and follows a 6-chapter story; `GAME_DESIGN.md` defines it and overrides `Implementation.md` where they differ (the overworld replaces the LifePath month screens and home dashboard; engine, concepts, mastery, telemetry and guardrails are unchanged).

Key docs: `TEAM_GUIDE.md` (what is built, platform API, how to add things; read first), `REPO_STRUCTURE.md` (folder map, owners, import rules), `Implementation.md` (product spec, data contracts in §6, use case IDs in §12, open decisions in §15.2), `work_division.md` (ownership; wins over `Implementation.md` §13), `P5_implementation.md` (platform/backend phases).

## Commands

All run from `frontend/` (Node 20.19+, CI uses 22):

```bash
npm run dev              # http://localhost:5173
npm test                 # Vitest (jsdom + fake-indexeddb)
npx vitest run path/to/file.test.ts   # single test file
npx vitest run -t "name" # single test by name
npm run lint             # oxlint, includes folder import rules
npm run typecheck        # tsc -b
npm run build            # tsc -b && vite build
```

Run `npm run typecheck && npm run lint && npm test` before a PR; CI (`.github/workflows/ci.yml`) runs typecheck → lint → test → build. The app runs without keys; Supabase needs `frontend/.env.local` (see `.env.example`). Tile sheet PNGs come from Kenney packs (fetch steps in `readme.md`); `/dev/tiles` shows tile indexes, `/dev` shows the outbox.

## Layout

- `frontend/` React 19 + Vite 8 + TS strict + Tailwind 4 + React Router 7 + Zustand + Dexie + vite-plugin-pwa. Also hosts the facilitator dashboard at `/facilitator` (lazy-loaded).
- `backend/supabase/` hosted Supabase: migrations (never edit one already run; add a newer file), `functions/ingest` edge function, RLS so a facilitator only sees their classes. Students never log in to Supabase.
- `shared/` event format (`telemetry/event.ts`, `validateEvent`) and sync protocol, used by both frontend and the Deno edge function, so it has no dependencies and imports use `.ts` extensions.

Aliases: `@/…` → `frontend/src/…`, `@shared/…` → `shared/…`. All routes are in `frontend/src/app/router.tsx`; games are registered in `frontend/src/games/registry.ts` (games never import each other).

## Architecture rules (lint-enforced via `frontend/.oxlintrc.json`)

- `src/core/**` and any `**/logic/**` folder are **pure**: no React, Dexie, Supabase, `@/platform`, `@/ui`, or app/feature/game/runtime imports. Put rules, scoring and movement logic here with `*.test.ts` beside it.
- `src/platform/` is the only code touching IndexedDB, network or Supabase. Everything else imports from `@/platform` (never a subfolder): `saveGame/loadGame`, `saveSnapshot`, `getSetting/setSetting`, profiles, `logEvent/logResult`, `setTelemetryContext`, `useSyncStatus`, `t()`.
- `src/ui/` is presentational (design kit, pixel/tile components).
- The engine must be deterministic (same seed + same choices → same state) for rewind/replay; don't use `Math.random()`/`Date.now()` in core logic (inject them).

## Conventions

- Mini-games live in `games/<pillar>/<game>/` (`index.ts` exports a `MiniGame`, `logic/` for pure code); copy `games/example/`. Contract is in `core/types/index.ts`. In non-`lifepath` modes a game's `effects` must not touch the LifePath character.
- Every student-visible string goes through `t('<namespace>.<key>')` with text in `content/i18n/en/<namespace>.json` (namespace = file name). Facilitator UI is English-only.
- Telemetry IDs (activity, concept, choice, misconception) are short code-like strings, never free text; concept/misconception IDs are snake_case in `content/concepts.json`.
- Respect `profile.a11y.timersOff`: timers may show but never run out.
- Shared files (`core/types`, `concepts.json`, `platform/`, `ui/`, `shared/`, `router.tsx`, `registry.ts`) change only with their owner's review. Branch names: `p<n>/<topic>`.
- Product rules: simulated only (never ask about or store a student's real money, family or messages; no email/phone, class code + picture-PIN); no real bank, fund, app, company or brand names; projections show ranges plus assumptions.

## Current state

- **Paisapur** (`/play`) is built and fully playable through all six chapters: `core/engine` (money rules), `core/market` (seeded fictional market), `core/world` (maps/collision), `core/story` (script interpreter + content loaders), `features/paisapur` (canvas renderer, overlays, panels). Content: `content/world/{legend.json,maps/}`, `content/story/*.json`, `content/paisapur/{items,quiz}.json`, `content/concepts.json`, strings in `content/i18n/en/{story,concepts,quiz,paisapur,choice,objective,signs,maps,who,toast,errors}.json`.
- Maps are generated from a Python script kept outside the repo; edit the JSON directly now. Map rows must stay rectangular; `core/story/content.test.ts` checks every key, ID, warp and NPC script, and `playthrough.test.ts` has a bot play the whole year, so run `npm test` after any content change.
- Story scripts are JSON step lists (`say`, `choice`, `if`, `do`, `once`, `quiz`, `concept`, `open`, `sleep`, `call`, …; see `core/story/index.ts`). Conditions are strings like `chapter>=2 && !flag:x`. One-time events are auto scripts in `content/story/auto.json` and must set the flag that stops them re-running.
- Also in core: `core/rival` (Kabir's life, re-simulated from the player's seed and `chapterMonths`), `core/timeline` (What-If checkpoints/rewind/compare), `core/story/duel.ts` (Scam Duels, content in `content/paisapur/duels.json`). New `LifeState` fields need a default in `newLife()`; `normalize()` fills them in for old saves.
- **Mini-games inside the story use the story's economy.** `games/adapter.ts` passes `stateSlice.story` (income, itemised needs, cash, bank, emergency fund, goal, shop prices) and the player's real spending; games read money only through the context helpers in `games/everyday/shared/economics.ts` (`incomeOf`, `billsOf`, `goalOf`, `disposableOf`, `cashOf`, `storyPrice`). The persona table there is the Arcade fallback only. Debt Ladder computes its rates from `core/engine` `RULES`. `games/everyday/coherence.test.tsx` fails if a game and the story disagree.
- A story `minigame` step can stage the scene (`params`, e.g. the shock and its price), turn simple game effects into story money (`apply: true`: deposits, meters, a sharper goal and its monthly saving; see `core/story/gameEffects.ts`), and run story steps for a choice made inside the game (`on: { "stepId:choiceId": [...] }`). Where a game covers a decision, the dialogue must not ask it again.
- Still stubs elsewhere: `core/types` `GameState`/`Persona` placeholders (Paisapur uses `LifeState` from `core/engine`), `t()` English only, `syncNow()` doesn't upload, `/home` is temporary.
