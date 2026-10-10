# PaisaPath

PaisaPath is an offline-first web app that teaches financial literacy to Grade 11–12 students in Hyderabad by letting them live a fictional character's financial life month by month, from opening a bank account to investing and staying safe from scams. Students can make mistakes safely, rewind to earlier decisions and compare the outcomes. It is built for the Vanguard India *Community Stewardship* problem statement at ECell Megathon 2026.

## Repository

```
frontend/   React app students install (PWA), plus the facilitator dashboard at /facilitator
backend/    Supabase: database tables, access rules, edge functions
shared/     Code both sides use: the event format and sync protocol
```

See [REPO_STRUCTURE.md](REPO_STRUCTURE.md) for the full layout, who owns which folder, and the import rules.

## Setup

Requires Node 20.19+ (22 recommended).

```bash
cd frontend
npm install
npm run dev
```

### Tile art (one-time)

The graphics are 2D tile sheets from Kenney's CC0 packs *Tiny Town* and *Tiny Dungeon*. The PNGs are not downloaded by `npm install`; fetch them once:

```bash
cd frontend
mkdir -p .tmp-assets public/assets/tiny-town public/assets/tiny-dungeon
curl -L -o .tmp-assets/tiny-town.zip "https://kenney.nl/media/pages/assets/tiny-town/a415fbeb49-1735736916/kenney_tiny-town.zip"
curl -L -o .tmp-assets/tiny-dungeon.zip "https://kenney.nl/media/pages/assets/tiny-dungeon/f8422efb44-1674742415/kenney_tiny-dungeon.zip"
unzip -o .tmp-assets/tiny-town.zip -d .tmp-assets/tiny-town
unzip -o .tmp-assets/tiny-dungeon.zip -d .tmp-assets/tiny-dungeon
cp .tmp-assets/tiny-town/Tilemap/tilemap_packed.png public/assets/tiny-town/tilemap.png
cp .tmp-assets/tiny-dungeon/Tilemap/tilemap_packed.png public/assets/tiny-dungeon/tilemap.png
cp .tmp-assets/tiny-town/License.txt public/assets/tiny-town/License.txt
cp .tmp-assets/tiny-dungeon/License.txt public/assets/tiny-dungeon/License.txt
rm -rf .tmp-assets
```

Open `/dev/tiles` to see every tile with its index. Credits are in `frontend/public/assets/CREDITS.md`.

### Keys

The app runs without any keys. To connect it to Supabase, copy `frontend/.env.example` to `frontend/.env.local` and fill in the project URL and anon key. Backend setup is in [backend/README.md](backend/README.md).

| Command (in `frontend/`) | What it does |
|---|---|
| `npm run dev` | Runs the app at http://localhost:5173 |
| `npm test` | Unit tests |
| `npm run lint` | Lint, including the folder import rules |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build |

CI runs typecheck, lint, tests and build on every pull request.

| Page | What it is |
|---|---|
| `/` | Landing page: enter the simulator or play minigames. New players are sent through setup and the starting-point questions first |
| `/welcome`, `/setup` | First launch: language, accessibility, class code, avatar, picture-PIN |
| `/onboarding` | Starting-point questions (what you know, your status, your goals), asked once per player |
| `/who` | Player picker on a shared phone |
| `/join/ABC123` | Link inside the class QR; opens setup with the code filled in |
| `/village` | The playable simulator: walk with arrow keys (or the on-screen pad), enter shops, talk at the counter |
| `/home` | Temporary student home (P2 replaces it) |
| `/arcade` | Temporary minigame menu (P4 replaces it) |
| `/facilitator` | Facilitator login, classes, plan, insights |
| `/dev` | Developer page: Supabase status and outbox events |
| `/dev/tiles` | Developer page: every tile of each sprite sheet with its index |

## Documents

- [TEAM_GUIDE.md](TEAM_GUIDE.md): **start here**, everything built so far and how to add your work
- [Implementation.md](Implementation.md): product and design spec
- [work_division.md](work_division.md): who builds what
- [REPO_STRUCTURE.md](REPO_STRUCTURE.md): code layout and rules
- [P5_implementation.md](P5_implementation.md): P5's phased plan
