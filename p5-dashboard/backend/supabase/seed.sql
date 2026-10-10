-- Local development seed data. Runs on `npx supabase db reset` (local only).
-- Facilitators need an auth user, so full demo data is added in P5 Phase 7.

insert into public.ngos (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Demo NGO');
