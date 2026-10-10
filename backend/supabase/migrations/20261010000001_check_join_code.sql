-- Lets the student setup screen check a class code without reading the
-- classes table. Returns only the class name and language. Owner: P5.

create or replace function public.check_join_code(code text)
returns table (name text, language text)
language sql stable security definer set search_path = public as $$
  select c.name, c.language
  from public.classes c
  where c.join_code = upper(code) and c.consent_confirmed;
$$;

revoke all on function public.check_join_code(text) from public;
grant execute on function public.check_join_code(text) to anon, authenticated;
