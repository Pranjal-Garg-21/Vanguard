# MoneyPath

MoneyPath is an offline-first web app that teaches financial literacy to Grade 11–12 students in Hyderabad by letting them live a fictional character's financial life month by month, from opening a bank account to investing and staying safe from scams. Students can make mistakes safely, rewind to earlier decisions and compare the outcomes. It is built for the Vanguard India *Community Stewardship* problem statement at ECell Megathon 2026.

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
| `/` | Sends students to welcome, player picker or home |
| `/welcome`, `/setup` | First launch: language, accessibility, class code, avatar, picture-PIN |
| `/who` | Player picker on a shared phone |
| `/join/ABC123` | Link inside the class QR; opens setup with the code filled in |
| `/home` | Temporary student home (P2 replaces it) |
| `/facilitator` | Facilitator login, classes, plan, insights |
| `/dev` | Developer page: Supabase status and outbox events |

## Documents

- [TEAM_GUIDE.md](TEAM_GUIDE.md): **start here**, everything built so far and how to add your work
- [Implementation.md](Implementation.md): product and design spec
- [work_division.md](work_division.md): who builds what
- [REPO_STRUCTURE.md](REPO_STRUCTURE.md): code layout and rules
- [P5_implementation.md](P5_implementation.md): P5's phased plan
