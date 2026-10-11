# MoneyPath

Setup and run instructions. The solution itself is described in `deliverables/final_report.pdf`.

## Requirements

- Node.js 20.19 or newer (22 recommended) and npm
- A modern browser (Chrome, Edge or Firefox)
- Optional: a Supabase project, only for the facilitator dashboard and class sync. The student app runs fully without it.

## Run the app

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Add `-- --host` to `npm run dev` to open it from a phone on the same network.

Useful pages once it is running:

| Page | Purpose |
|---|---|
| `/` | Start page |
| `/play` | Main game (arrow keys or WASD to move, Z talk, X back, M menu; on-screen pad on phones) |
| `/facilitator` | Facilitator dashboard (needs Supabase, below) |

## Production build

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
