-- 14 Nov 2026 · care team, period log, doctors' plans. Safe to re-run.

-- 1) Period log: start dates (newest first) to work out the cycle day and the best test days.
alter table public.profiles add column if not exists period_starts date[];
grant update (period_starts) on public.profiles to authenticated;

-- 2) "My care team": doctors the patient chooses (in GiGi or outside), with their plan or "private".
--    Each doctor only sees what she shares; their notes and replies stay between her and that doctor.
create table if not exists public.care_team (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null default auth.uid() references public.profiles on delete cascade,
  doctor_id uuid references public.doctors on delete set null,       -- set when the doctor is (or joins) GiGi
  name text not null,
  specialty text,
  email text,
  phone text,
  coverage text,                                                     -- 'private' or the plan / insurer name
  share_results boolean not null default true,
  share_id uuid references public.shares on delete set null,
  invite_token uuid not null default gen_random_uuid(),
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz default now()
);
alter table public.care_team enable row level security;
drop policy if exists care_team_patient on public.care_team;
create policy care_team_patient on public.care_team for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
-- the invite token never needs to be read by the patient's browser after creation, but it is her own row: fine.

-- Invite a doctor from outside GiGi by e-mail (at most once a day per entry).
create or replace function public.invite_care_doctor(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r care_team;
begin
  select * into r from care_team where id = p_id and patient_id = auth.uid();
  if r.id is null then raise exception 'not found'; end if;
  if r.doctor_id is not null then raise exception 'already in GiGi'; end if;
  if coalesce(r.email, '') !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'invalid e-mail'; end if;
  if r.invited_at is not null and r.invited_at > now() - interval '1 day' then raise exception 'already invited today'; end if;
  update care_team set invited_at = now() where id = p_id;
  insert into notifications (user_id, type, data, link) values (auth.uid(), 'care_invite',
    jsonb_build_object('doctor_name', r.name, 'invite_email', lower(r.email),
      'patient_name', (select full_name from profiles where id = auth.uid()),
      'invite_link', '/doctor/login?mode=signup&invite=' || r.invite_token),
    '/care-team');
end $$;

-- A doctor who signed up from the invite links herself: same e-mail as invited, then the share is created.
create or replace function public.accept_care_invite(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare r care_team; me_email text; sid uuid;
begin
  if not exists (select 1 from doctors where id = auth.uid()) then return false; end if;
  select lower(email) into me_email from auth.users where id = auth.uid();
  select * into r from care_team where invite_token = p_token and doctor_id is null;
  if r.id is null or lower(coalesce(r.email, '')) <> me_email then return false; end if;
  if r.share_results then
    insert into shares (patient_id, doctor_id, scopes, expires_at)
    values (r.patient_id, auth.uid(), '{bloodwork,history}', now() + interval '365 days') returning id into sid;
  end if;
  update care_team set doctor_id = auth.uid(), joined_at = now(), share_id = sid where id = r.id;
  insert into notifications (user_id, type, data, link) values (r.patient_id, 'care_joined',
    jsonb_build_object('doctor_name', (select full_name from profiles where id = auth.uid())), '/care-team');
  return true;
end $$;
revoke all on function public.invite_care_doctor(uuid) from public, anon;
revoke all on function public.accept_care_invite(uuid) from public, anon;
grant execute on function public.invite_care_doctor(uuid) to authenticated;
grant execute on function public.accept_care_invite(uuid) to authenticated;
