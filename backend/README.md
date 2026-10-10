# backend

The cloud side of PaisaPath, on Supabase. Owner: P5.

```
backend/supabase/
├── config.toml                 Local Supabase settings
├── migrations/                 Database tables and access rules, applied in order
├── functions/
│   └── ingest/                 Receives event batches from student phones
└── seed.sql                    Local demo data
```

Students never touch the database directly. Their phones call the `ingest` function, which checks the class code and writes with the service role. Facilitators log in, and row-level security shows them only their own classes.

## Connect to the hosted project

1. Get the project from Supabase: **Project Settings → API** gives the project URL, the anon (or publishable) key and the service_role (or secret) key.
2. **Frontend keys:** copy `frontend/.env.example` to `frontend/.env.local` and fill in the URL and anon key.
3. **Link the CLI** (from this folder):
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```
4. **Create the tables:**
   ```bash
   npx supabase db push
   ```
5. **Deploy the function:**
   ```bash
   npx supabase functions deploy ingest
   ```

Where each key goes:

| Key | Where | Safe in the browser? |
|---|---|---|
| Project URL | `frontend/.env.local` → `VITE_SUPABASE_URL` | Yes |
| anon / publishable key | `frontend/.env.local` → `VITE_SUPABASE_ANON_KEY` | Yes (RLS protects data) |
| service_role / secret key | `backend/.env` → `SUPABASE_SECRET_KEY`, for admin scripts only. Edge functions get it from Supabase automatically | **No, never** |
| Database password | `backend/.env` → `SUPABASE_DB_PASSWORD` | **No** |
| CLI access token (optional) | `backend/.env` → `SUPABASE_ACCESS_TOKEN` | **No** |

`backend/.env` is git-ignored; `backend/.env.example` is the committed template. To make the CLI use these values, load them first: `set -a; source .env; set +a`.

## Run locally (optional, needs Docker)

```bash
npx supabase start       # local Postgres, auth and functions
npx supabase db reset    # re-applies migrations and seed.sql
npx supabase functions serve ingest
```

`supabase start` prints a local URL and anon key; put them in `frontend/.env.local` to develop against the local stack.

## Adding a facilitator

Public sign-up is off locally (`config.toml`). On the hosted project, also turn off **Allow new users to sign up** in the Authentication settings. Create the user in **Authentication → Users** in the Supabase dashboard, then add a row to `public.facilitators` with the same `id`.
