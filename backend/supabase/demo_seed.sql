-- Demo data for the facilitator dashboard. Owner: P5.
--
-- Run this in the Supabase SQL Editor (it is NOT a migration, so it never runs by itself).
-- It creates two functions:
--
--   select seed_demo_class('<your facilitator user id>');        -- adds a class with 24 sample students
--   select seed_demo_class('<your facilitator user id>', 40);    -- or choose how many students
--   select unseed_demo_class('<your facilitator user id>');      -- removes the sample class again
--
-- Find your user id in Authentication > Users, or it is shown on the facilitator page
-- if your account has not been added as a facilitator yet. Everything created here is
-- clearly marked: the class is named "Demo class (sample data)" and player ids start
-- with "demo-". The students are made up. No real data is touched.

create or replace function public.seed_demo_class(p_facilitator uuid, p_students int default 24)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class   uuid;
  v_code    text;
  v_tag     text;
  v_pid     text;
  v_skill   numeric;
  v_concept text;
  v_hard    numeric;
  v_correct boolean;
  v_mis     text;
  v_activity text;
  v_ts      timestamptz;
  v_total   int;
  n         int;
  k         int;
  names     text[] := array['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Ananya', 'Vihaan', 'Isha', 'Arjun', 'Saanvi', 'Reyansh', 'Kavya', 'Ishaan', 'Anika', 'Advait', 'Tara', 'Vivaan', 'Navya', 'Dhruv', 'Riya', 'Krish', 'Mira', 'Aditya', 'Pooja'];
  concepts  text[] := array['upi_collect', 'qr_scam', 'pin_secrecy', 'wrong_transfer', 'fake_kyc', 'red_flags', 'prize_scam', 'job_scam', 'impersonation', 'account_takeover', 'authority_impersonation', 'fake_support', 'loan_app', 'fraud_recovery'];
begin
  if not exists (select 1 from public.facilitators where id = p_facilitator) then
    raise exception 'No facilitator with id %. Add yourself to the facilitators table first.', p_facilitator;
  end if;

  insert into public.classes (facilitator_id, name, centre, language, expected_size, consent_confirmed)
  values (p_facilitator, 'Demo class (sample data)', 'Demo centre', 'en', p_students, true)
  returning id, join_code into v_class, v_code;

  v_tag := left(replace(v_class::text, '-', ''), 8);

  for n in 1..p_students loop
    v_pid := 'demo-' || v_tag || '-' || n;
    -- Each student has their own chance of choosing safely, from 30% to 95%.
    v_skill := 0.30 + random() * 0.65;

    insert into public.players (pid, class_id, display_name, first_seen, last_sync)
    values (
      v_pid, v_class,
      names[1 + ((n - 1) % array_length(names, 1))] || case when n > array_length(names, 1) then ' ' || ((n - 1) / array_length(names, 1) + 1) else '' end,
      now() - interval '6 days',
      now() - random() * interval '30 hours'
    );

    v_total := 40 + floor(random() * 50)::int;
    for k in 1..v_total loop
      v_concept := concepts[1 + floor(random() * array_length(concepts, 1))::int];

      -- Some tricks fool more people than others.
      v_hard := case v_concept
        when 'upi_collect' then 0.80
        when 'fake_kyc' then 0.75
        when 'authority_impersonation' then 0.55
        when 'loan_app' then 0.60
        when 'account_takeover' then 0.65
        when 'wrong_transfer' then 0.70
        when 'qr_scam' then 0.70
        when 'fake_support' then 0.65
        else 0.90
      end;
      v_correct := random() < least(0.97, v_skill * v_hard + 0.08);

      v_mis := case when v_correct then null else case v_concept
        when 'upi_collect' then 'pin_needed_to_receive'
        when 'qr_scam' then 'scan_to_receive'
        when 'pin_secrecy' then 'pin_uncovered'
        when 'wrong_transfer' then 'trust_sms_credit'
        when 'fake_kyc' then 'bank_will_call_for_otp'
        when 'red_flags' then 'click_unknown_link'
        when 'prize_scam' then 'pay_to_win'
        when 'job_scam' then 'pay_to_get_job'
        when 'impersonation' then 'trust_familiar_name'
        when 'account_takeover' then 'trust_familiar_account'
        when 'authority_impersonation' then 'authority_demands_money'
        when 'fake_support' then 'search_result_is_official'
        when 'loan_app' then 'loan_app_permissions'
        else 'fraud_recovery_mistake'
      end end;

      v_activity := case v_concept
        when 'upi_collect' then 'UC-SAFE-01' when 'qr_scam' then 'UC-SAFE-01' when 'pin_secrecy' then 'UC-SAFE-01' when 'wrong_transfer' then 'UC-SAFE-01'
        when 'fake_kyc' then 'UC-SAFE-03' when 'prize_scam' then 'UC-SAFE-03' when 'job_scam' then 'UC-SAFE-03' when 'impersonation' then 'UC-SAFE-03'
        when 'red_flags' then 'UC-SAFE-04'
        when 'loan_app' then 'UC-SAFE-06' when 'fraud_recovery' then 'UC-SAFE-10'
        else 'UC-SAFE-05'
      end;

      -- Spread over the last week; the first few of each student are recent so the "just happened" list is live.
      v_ts := case when k <= 2 then now() - random() * interval '3 hours' else now() - random() * interval '6 days' end;

      insert into public.events (eid, pid, class_id, mode, activity, concept, choice, correct, misconception, level, timeline, ts, v)
      values (
        'demo-' || v_tag || '-' || n || '-' || k, v_pid, v_class, 'arcade', v_activity, v_concept,
        case when v_correct then 'safe_choice' else 'risky_choice' end,
        v_correct, v_mis, 1 + floor(random() * 2)::int, 'main', v_ts, 1
      );
    end loop;
  end loop;

  return v_code;
end;
$$;

-- Removes the sample class and, through cascading deletes, its players and events.
create or replace function public.unseed_demo_class(p_facilitator uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  removed int;
begin
  delete from public.classes where facilitator_id = p_facilitator and name = 'Demo class (sample data)';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Only the database owner (the SQL Editor) may run these. They are not callable from the app.
revoke all on function public.seed_demo_class(uuid, int) from public, anon, authenticated;
revoke all on function public.unseed_demo_class(uuid) from public, anon, authenticated;
