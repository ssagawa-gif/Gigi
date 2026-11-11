-- 11 Nov 2026 · tester feedback. Safe to re-run.

-- 1) Health history at registration (Dr Kat): date of birth + yes/no answers with details.
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists medical_history jsonb;

-- 2) Plans (Ste): Free / Premium. Premium is free to try during the beta.
alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles add column if not exists plan_since timestamptz;
alter table public.profiles add column if not exists followup_months int;
do $$ begin
  alter table public.profiles add constraint profiles_plan_check check (plan in ('free','premium'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_followup_check check (followup_months is null or followup_months in (3,6,12));
exception when duplicate_object then null; end $$;
-- the patient edits her history and reminder interval; the plan only changes through the functions below
grant update (birth_date, medical_history, followup_months) on public.profiles to authenticated;

create or replace function public.start_premium_trial()
returns void language sql security definer set search_path = public as $$
  update profiles set plan = 'premium', plan_since = coalesce(plan_since, now())
  where id = auth.uid() and role = 'patient';
$$;
create or replace function public.end_premium()
returns void language sql security definer set search_path = public as $$
  update profiles set plan = 'free' where id = auth.uid();
$$;
revoke all on function public.start_premium_trial() from public, anon;
revoke all on function public.end_premium() from public, anon;
grant execute on function public.start_premium_trial() to authenticated;
grant execute on function public.end_premium() to authenticated;

-- 3) Free plan: a doctor with an active share sees the last 12 months of results; Premium: everything.
create or replace function public.doctor_can_see(p_patient uuid, p_date date)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_active_share(p_patient, auth.uid())
     and (p_date is null or p_date >= current_date - interval '1 year'
          or exists (select 1 from profiles where id = p_patient and plan = 'premium'));
$$;
drop policy if exists results_doctor on public.results;
create policy results_doctor on public.results for select to authenticated
  using (public.doctor_can_see(patient_id, test_date));
drop policy if exists reports_doctor on public.lab_reports;
create policy reports_doctor on public.lab_reports for select to authenticated
  using (public.doctor_can_see(patient_id, test_date));

-- 4) Premium: reminder to book the follow-up visit, N months (3/6/12, chosen by her) after a visit,
--    unless she already booked another one with the same doctor. Sent once per visit (app + e-mail).
alter table public.appointments add column if not exists followup_reminded_at timestamptz;
create or replace function public.send_followup_reminders()
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  for r in
    select a.id, a.patient_id, a.doctor_id, p.followup_months as months,
           (select full_name from profiles where id = a.doctor_id) as doctor_name
    from appointments a join profiles p on p.id = a.patient_id
    where a.status = 'booked' and a.followup_reminded_at is null
      and p.plan = 'premium'
      and a.starts_at + make_interval(months => coalesce(p.followup_months, 6)) <= now()
      and not exists (select 1 from appointments b where b.patient_id = a.patient_id and b.doctor_id = a.doctor_id
                      and b.status = 'booked' and b.starts_at > a.starts_at)
  loop
    insert into notifications (user_id, type, data, link)
    values (r.patient_id, 'followup_reminder',
            jsonb_build_object('doctor_name', r.doctor_name, 'doctor_id', r.doctor_id, 'months', coalesce(r.months, 6)),
            '/doctors/' || r.doctor_id);
    update appointments set followup_reminded_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.send_followup_reminders() from public, anon, authenticated;

-- run it every day at 08:00 UTC (pg_cron is available on Supabase; skipped where it isn't)
do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'gigi_followup_reminders';
  perform cron.schedule('gigi_followup_reminders', '0 8 * * *', 'select public.send_followup_reminders()');
exception when others then raise notice 'pg_cron not available: %', sqlerrm;
end $$;
