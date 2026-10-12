# Gamified Finanacial Literacy 

MoneyPath is an offline-first financial literacy game for Grade 11-12 students in Hyderabad. Students play through a fictional year in **Paisapur**, a top-down tile RPG where everyday decisions teach budgeting, saving, borrowing, investing, insurance and scam awareness.

The student experience is designed around a fictional character and simulated money only. It never asks for or stores a student's real financial, family or contact information.

## Features

- **Paisapur overworld:** Explore a tile-based town, enter buildings, talk to NPCs and progress through six story chapters.
- **Story-led learning:** Financial concepts appear in context through dialogue, choices, quizzes, encounters and chapter challenges.
- **Month-by-month money life:** Receive income, pay recurring needs, work limited shifts, make spending decisions and end each month at home.
- **Financial systems:** Banking, savings, emergency funds, budgeting, needs versus wants, loans, credit, bonds, fictional stocks, property, gold, insurance and risk.
- **Rival simulation:** Kabir's parallel life is re-simulated from the same seed so students can compare the consequences of different choices.
- **What-If Machine:** Rewind to checkpoints and compare alternate decisions without losing the main timeline.
- **Scam Duels:** Practice recognising fictional scams, predatory loan offers and recovery steps in interactive encounters.
- **Arcade minigames:** Play sandbox activities for extra practice without changing the story economy.
- **Money Journal and mastery:** Track concepts seen and mastered, with badges awarded for chapter challenges.
- **Offline-first PWA:** Student progress is stored locally and the app remains playable without a network connection.
- **Facilitator dashboard:** An optional Supabase-backed dashboard provides class and learning telemetry when configured.
- **Accessibility and language foundations:** Responsive controls, on-screen movement controls, timer-safe accessibility settings and bundled Indian-language font support.

## Implementation

The application is organised as a deterministic game runtime with a React user interface:

- `frontend/src/core/` contains pure rules and state transitions for the money engine, seeded market, world movement, story interpreter, rival simulation, timeline and scam encounters. The same seed and choices produce the same result for replay and rewind.
- `frontend/src/features/paisapur/` renders the overworld canvas, overlays, dialogue and gameplay panels. Routes and game registrations live in `frontend/src/app/` and `frontend/src/games/`.
- `frontend/src/content/` stores maps, story scripts, quizzes, concepts, item data and translated strings. Content is validated separately with `tools/authoring/validate.mjs`.
- `frontend/src/platform/` owns persistence, settings, profiles, telemetry and optional network synchronisation. Student saves use IndexedDB through Dexie.
- `frontend/src/ui/` provides reusable presentational components and pixel/tile UI primitives; the core logic does not import React or platform services.
- `shared/` contains dependency-free telemetry event validation and the sync protocol shared by the frontend and Supabase Edge Function.
- `backend/supabase/` contains database migrations, row-level security and the `ingest` Edge Function for facilitator data. Student gameplay does not require authentication.

Story steps are data-driven (`say`, `choice`, `if`, `do`, `once`, `quiz`, `concept`, `open`, `sleep`, `call` and minigame steps), allowing new lessons and events to be authored without changing the game engine. The engine injects time and randomness-sensitive inputs rather than using ambient `Date.now()` or `Math.random()` in core logic.

## Technology stack

- **Frontend:** React 19, TypeScript, React Router 7, Vite 8 and Tailwind CSS 4
- **State and persistence:** Zustand, Dexie and IndexedDB
- **PWA and offline support:** `vite-plugin-pwa`, Workbox and service-worker caching
- **UI:** Radix UI primitives, Tailwind utilities, `lucide-react` and class-variance utilities
- **Backend:** Supabase PostgreSQL, Auth, Row Level Security and Deno Edge Functions
- **Testing and quality:** Vitest, jsdom, fake-indexeddb, TypeScript strict checking and oxlint
- **Assets and typography:** Kenney CC0 tile art, browser-generated audio, Pixelify Sans, Ubuntu and Indian-language fonts via Fontsource

## Setup and run

### Prerequisites

- Node.js 20.19 or newer (Node 22 is recommended) and npm
- A modern browser such as Chrome, Edge or Firefox
- Optional: a Supabase project for the facilitator dashboard and class sync. The student app runs without Supabase.

### Install dependencies

From the repository root:

```bash
cd frontend
npm install
```

Supabase is optional. For local student gameplay, no environment variables are required. To enable the facilitator dashboard, copy the example environment file and add the project values:

```bash
cp .env.example .env.local
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env.local`. Never place a Supabase service-role or secret key in the frontend.

### Start the development server

```bash
npm run dev
```

Open http://localhost:5173. To test on a phone connected to the same network, run:

```bash
npm run dev -- --host
```

Useful pages once the server is running:

Useful pages once it is running:

| Page | Purpose |
|---|---|
| `/` | Start page |
| `/play` | Main game (arrow keys or WASD to move, Z talk, X back, M menu; on-screen pad on phones) |
| `/facilitator` | Facilitator dashboard (needs Supabase, below) |

### Production build and preview

```bash
cd frontend
npm run build      # type-checks, then writes the installable app to frontend/dist
npm run preview    # serves the build at http://localhost:4173
```

## Tests and checks

From `frontend/`:

```bash
npm test               # all unit tests (Vitest)
npx vitest run <file>  # one test file
npm run typecheck      # TypeScript
npm run lint           # oxlint, including folder import rules
```

From the repository root (no install needed):

```bash
node tools/authoring/validate.mjs    # content validator
```

## Connect Supabase (optional)

1. Create a Supabase project. From **Project Settings → API** copy the project URL and the anon (publishable) key.
2. Copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never put the secret key in the frontend.
3. From `backend/`, create the tables and deploy the event function:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   npx supabase functions deploy ingest
   ```
   Without the CLI, run each file in `backend/supabase/migrations/` once, in filename order, in the dashboard's SQL Editor.
4. Add a facilitator: in **Authentication → Users** create a user with their email (tick *Auto confirm user*), copy the user's UID, then run in the SQL Editor:
   ```sql
   insert into public.facilitators (id, display_name) values ('<the UID>', 'Their name');
   ```
5. Restart `npm run dev`. The facilitator signs in at `/facilitator` with the emailed code.

More detail, including where each key goes, is in [backend/README.md](backend/README.md).

## Tile art

The tile sheets are already committed in `frontend/public/assets/`, so nothing needs downloading. To replace one, download the pack from kenney.nl (links in `frontend/public/assets/CREDITS.md`) and copy its `Tilemap/tilemap_packed.png` to `frontend/public/assets/<pack>/tilemap.png`. `/dev/tiles` shows every tile with its index.

## Third-party credits

- **Art:** *Tiny Town*, *Tiny Dungeon* and *RPG Urban Pack* by Kenney (kenney.nl), CC0 1.0. Details in `frontend/public/assets/CREDITS.md`. Music and sound effects are original and generated in the browser.
- **Fonts:** Ubuntu, Ubuntu Mono, Pixelify Sans, Noto Sans Telugu, Noto Sans Devanagari and Noto Nastaliq Urdu, via Fontsource (SIL Open Font License / Ubuntu Font Licence).
- **Libraries (MIT unless noted):** React, React Router, Vite, vite-plugin-pwa and Workbox, Tailwind CSS, tw-animate-css, Radix UI primitives, class-variance-authority, clsx, tailwind-merge, lucide-react (ISC), Zustand, Dexie (Apache-2.0), supabase-js, qrcode, ulid, TypeScript (Apache-2.0), Vitest, jsdom, fake-indexeddb (Apache-2.0), oxlint.
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions on Deno).

## License

MIT. See [LICENSE](LICENSE).
