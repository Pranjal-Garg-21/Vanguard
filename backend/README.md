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
4. **Create the tables**, either with the CLI:
   ```bash
   npx supabase db push
   ```
   or by hand in the dashboard's **SQL Editor**: open each file in `supabase/migrations/`, paste it and click **Run**, **in filename order**:
   1. `20261010000000_init.sql`: all tables, join-code generator, row-level security
   2. `20261010000001_check_join_code.sql`: lets the student app check a class code

   Run each file only once. Later migrations get higher numbers; run only the new ones.
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

## Set up a facilitator and a demo class

Facilitators cannot sign themselves up. An admin adds them once:

1. In the Supabase dashboard open **Authentication, Users, Add user, Create new user**, enter the facilitator's email and tick *Auto confirm user*.
2. Copy that user's **UID**, then in the **SQL Editor** run:
   ```sql
   insert into public.facilitators (id, display_name) values ('<the UID>', 'Their name');
   ```
3. The facilitator opens `/facilitator`, enters their email, and signs in with the code or link from the email.
4. **Optional, for a demo:** run the whole of `supabase/demo_seed.sql` once in the SQL Editor, then:
   ```sql
   select seed_demo_class('<the UID>');
   ```
   This adds a class called "Demo class (sample data)" with 24 made-up students and about 1,600 answers, so the dashboard is not empty. Remove it again with `select unseed_demo_class('<the UID>');`.

## Facilitator-made scenarios (custom inbox)

Facilitators can write their own scam practice for a class in the **Scenarios** tab. To switch it on for the hosted project, once:

1. In the **SQL Editor**, run `supabase/migrations/20261011000000_custom_scenarios.sql` (creates the `custom_scenarios` table and its access rules).
2. Redeploy the upload function so it also sends published scenarios to phones:
   ```bash
   cd backend
   npx supabase functions deploy ingest --project-ref <your-project-ref>
   ```

How it flows: the facilitator saves a scenario (a draft, or published), phones receive published ones at their next sync (even with no answers to upload), keep them offline, and show them under **From your facilitator** in Stay Safe. Answers appear in Insights under the skill the facilitator chose. Unpublishing or deleting removes it from phones at their next sync.

Students never read the table directly; `ingest` returns only the published scenarios for the class whose join code was sent.

## Check that sync can work

The student app uploads events to the `ingest` function. From the project folder, this should print `200` (a `404` means the function is not deployed yet):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS "https://<your-project-ref>.supabase.co/functions/v1/ingest" \
  -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST"
```

A class only accepts events once a facilitator has created it **and** confirmed consent (`classes.consent_confirmed = true`). An unknown or unconfirmed join code makes `ingest` answer `404`, and the app then marks that code as invalid and stops sending.

In the app, open `/dev` and press **Sync now** to see the sync state, the number of events waiting and the last error.

## Run locally (optional, needs Docker)

```bash
npx supabase start       # local Postgres, auth and functions
npx supabase db reset    # re-applies migrations and seed.sql
npx supabase functions serve ingest
```

`supabase start` prints a local URL and anon key; put them in `frontend/.env.local` to develop against the local stack.

## Adding a facilitator

There are no shared logins and no passwords. Each facilitator signs in with their own email and receives a sign-in link (or code). Only registered emails can sign in.

1. **Authentication → Users → Add user → Send invitation** (or "Create new user"), with their email.
2. In the **SQL Editor**, register them as a facilitator:
   ```sql
   insert into public.facilitators (id, display_name)
   select id, 'Their name' from auth.users where email = 'them@example.com';
   ```
3. They open `/facilitator`, enter their email and click the link in the email.

Settings to check once on the hosted project:
- **Authentication → Sign In / Providers:** turn off **Allow new users to sign up** (public sign-up is already off locally in `config.toml`).
- **Authentication → URL Configuration:** add `http://localhost:5173/**` (and your deployed URL later) to **Redirect URLs**, so the email link returns to the app.
- To get a 6-digit code in the email as well as the link, add `{{ .Token }}` to the **Magic Link** email template.
