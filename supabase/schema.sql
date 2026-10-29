-- =====================================================================
-- GiGi — Supabase database (run once in Supabase > SQL Editor > New query)
-- Tables, privacy rules (Row Level Security), automatic notifications,
-- booking, and the private bucket for lab report files.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Profiles (one per account) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'patient' check (role in ('patient','doctor')),
  full_name text,
  language text default 'en' check (language in ('en','pt','es')),
  city text,
  country text,
  reasons text[] default '{}',
  history_note text,
  consent_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.doctors (
  id uuid primary key references public.profiles on delete cascade,
  verified boolean not null default false,       -- GiGi approves each doctor by hand
  specialty text,
  area text,
  languages text[] default '{}',
  consultation text default 'both',
  insurers text[] default '{}',
  first_visit_fee numeric,
  results_visit_fee numeric,
  bio text
);

-- ---------- Health record ----------
create table if not exists public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null default auth.uid() references public.profiles on delete cascade,
  file_path text,
  file_name text,
  lab_name text,
  country text,
  test_date date,
  created_at timestamptz default now()
);

-- Each result keeps the value exactly as printed AND a canonical value,
-- so results from any country/lab/unit stay comparable forever.
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null default auth.uid() references public.profiles on delete cascade,
  report_id uuid references public.lab_reports on delete set null,
  marker_code text not null,
  loinc text,
  value numeric not null,
  unit text not null,
  ref_low numeric,
  ref_high numeric,
  value_canonical numeric,
  ref_low_canonical numeric,
  ref_high_canonical numeric,
  canonical_unit text,
  test_date date not null,
  lab_name text,
  country text,
  status text check (status in ('low','normal','high','unknown')),
  needs_review boolean default false,
  created_at timestamptz default now()
);
create index if not exists results_patient_marker on public.results (patient_id, marker_code, test_date);

-- ---------- Doctor reviews (the request the doctor receives) ----------
create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null default auth.uid() references public.profiles on delete cascade,
  doctor_id uuid not null references public.doctors on delete cascade,
  marker_code text,
  result_ids uuid[] default '{}',
  note text,
  status text not null default 'open' check (status in ('open','answered')),
  response text,
  recommendation text,
  trust_rating int check (trust_rating between 1 and 5),
  created_at timestamptz default now(),
  answered_at timestamptz
);

-- ---------- Agenda ----------
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null default auth.uid() references public.doctors on delete cascade,
  starts_at timestamptz not null,
  minutes int not null default 30,
  booked boolean not null default false
);
create index if not exists slots_doctor_time on public.slots (doctor_id, starts_at);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.slots on delete set null,
  doctor_id uuid not null references public.doctors on delete cascade,
  patient_id uuid not null references public.profiles on delete cascade,
  starts_at timestamptz not null,
  minutes int default 30,
  type text,
  note text,
  status text not null default 'booked' check (status in ('booked','cancelled')),
  created_at timestamptz default now()
);

-- ---------- Sharing (who sees what) ----------
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null default auth.uid() references public.profiles on delete cascade,
  doctor_id uuid not null references public.doctors on delete cascade,
  scopes text[] not null default '{bloodwork}',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

-- ---------- Notifications (in-app + e-mail via webhook) ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  type text not null,
  data jsonb default '{}',
  link text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text, email text not null, plan text, consent boolean default false,
  created_at timestamptz default now()
);

-- Explicit access for the app's roles (works even if "Automatically expose new tables"
-- is off). Row Level Security below still decides which ROWS each person can see.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant insert on public.waitlist to anon;

-- =====================================================================
-- Helper functions (security definer avoids recursive policies)
-- =====================================================================
create or replace function public.has_active_share(p_patient uuid, p_doctor uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from shares s where s.patient_id = p_patient and s.doctor_id = p_doctor
                 and s.revoked_at is null and s.expires_at > now());
$$;

create or replace function public.doctor_knows_patient(p_patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_active_share(p_patient, auth.uid())
      or exists (select 1 from review_requests r where r.patient_id = p_patient and r.doctor_id = auth.uid())
      or exists (select 1 from appointments a where a.patient_id = p_patient and a.doctor_id = auth.uid());
$$;

-- New account -> profile (+ unverified doctor row if they signed up as doctor)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := case when new.raw_user_meta_data->>'role' = 'doctor' then 'doctor' else 'patient' end;
begin
  insert into profiles (id, role, full_name, language, consent_at)
  values (new.id, v_role, new.raw_user_meta_data->>'full_name',
          coalesce(new.raw_user_meta_data->>'language','en'), now());
  if v_role = 'doctor' then insert into doctors (id) values (new.id); end if;
  insert into notifications (user_id, type, data, link)
  values (new.id, case when v_role = 'doctor' then 'welcome_doctor' else 'welcome' end,
          jsonb_build_object('name', new.raw_user_meta_data->>'full_name'),
          case when v_role = 'doctor' then '/doctor/profile' else '/add' end);
  if v_role = 'doctor' then
    insert into notifications (user_id, type, data, link)
    select a.user_id, 'doctor_signup', jsonb_build_object('name', new.raw_user_meta_data->>'full_name'), '/admin'
    from admins a;  -- table created in updates/2026-10-29_admin.sql
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security: nobody sees anything unless a rule below allows it
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.lab_reports enable row level security;
alter table public.results enable row level security;
alter table public.review_requests enable row level security;
alter table public.slots enable row level security;
alter table public.appointments enable row level security;
alter table public.shares enable row level security;
alter table public.notifications enable row level security;
alter table public.waitlist enable row level security;

-- profiles: me; doctors are public to signed-in users; a doctor sees patients who shared/booked/asked
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or role = 'doctor' or public.doctor_knows_patient(id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- role can never be changed by the user
revoke update on public.profiles from authenticated;
grant update (full_name, language, city, country, reasons, history_note, consent_at) on public.profiles to authenticated;

-- doctors: verified doctors are listed; a doctor edits own profile (not 'verified')
drop policy if exists doctors_read on public.doctors;
create policy doctors_read on public.doctors for select to authenticated using (verified or id = auth.uid());
drop policy if exists doctors_update on public.doctors;
create policy doctors_update on public.doctors for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.doctors from authenticated;
grant update (specialty, area, languages, consultation, insurers, first_visit_fee, results_visit_fee, bio) on public.doctors to authenticated;

-- lab reports & results: owner full access; doctor reads only with an active share
drop policy if exists reports_owner on public.lab_reports;
create policy reports_owner on public.lab_reports for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
drop policy if exists reports_doctor on public.lab_reports;
create policy reports_doctor on public.lab_reports for select to authenticated
  using (public.has_active_share(patient_id, auth.uid()));

drop policy if exists results_owner on public.results;
create policy results_owner on public.results for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
drop policy if exists results_doctor on public.results;
create policy results_doctor on public.results for select to authenticated
  using (public.has_active_share(patient_id, auth.uid()));

-- review requests: patient creates/reads own; assigned doctor reads/answers
drop policy if exists reviews_patient on public.review_requests;
create policy reviews_patient on public.review_requests for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
drop policy if exists reviews_doctor_read on public.review_requests;
create policy reviews_doctor_read on public.review_requests for select to authenticated using (doctor_id = auth.uid());
drop policy if exists reviews_doctor_update on public.review_requests;
create policy reviews_doctor_update on public.review_requests for update to authenticated
  using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- patient may only change the trust rating; doctor may only answer
create or replace function public.guard_review_update()
returns trigger language plpgsql as $$
begin
  if auth.uid() = old.patient_id then
    if (new.response, new.recommendation, new.status, new.doctor_id) is distinct from
       (old.response, old.recommendation, old.status, old.doctor_id) then
      raise exception 'Patients can only rate a review';
    end if;
  elsif auth.uid() = old.doctor_id then
    if new.trust_rating is distinct from old.trust_rating or new.patient_id <> old.patient_id then
      raise exception 'Doctors can only answer a review';
    end if;
    if new.status = 'answered' and old.status = 'open' then new.answered_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists review_guard on public.review_requests;
create trigger review_guard before update on public.review_requests
  for each row execute function public.guard_review_update();

-- slots: everyone signed in can see availability; doctor manages own free slots
drop policy if exists slots_read on public.slots;
create policy slots_read on public.slots for select to authenticated using (true);
drop policy if exists slots_doctor on public.slots;
create policy slots_doctor on public.slots for insert to authenticated with check (doctor_id = auth.uid());
drop policy if exists slots_doctor_delete on public.slots;
create policy slots_doctor_delete on public.slots for delete to authenticated using (doctor_id = auth.uid() and not booked);

-- appointments: both sides read; creation/cancel only via functions below
drop policy if exists appts_read on public.appointments;
create policy appts_read on public.appointments for select to authenticated
  using (patient_id = auth.uid() or doctor_id = auth.uid());

-- shares: patient controls; doctor sees shares given to them
drop policy if exists shares_patient on public.shares;
create policy shares_patient on public.shares for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
drop policy if exists shares_doctor on public.shares;
create policy shares_doctor on public.shares for select to authenticated using (doctor_id = auth.uid());

-- notifications: only mine
drop policy if exists notif_mine on public.notifications;
create policy notif_mine on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for update to authenticated using (user_id = auth.uid());

-- waitlist: anyone may join, nobody may read from the app
drop policy if exists waitlist_insert on public.waitlist;
create policy waitlist_insert on public.waitlist for insert to anon, authenticated with check (true);

-- =====================================================================
-- Booking and cancelling (atomic, so two people can't take one slot)
-- =====================================================================
create or replace function public.book_slot(p_slot uuid, p_type text, p_note text)
returns public.appointments language plpgsql security definer set search_path = public as $$
declare s slots; a appointments;
begin
  select * into s from slots where id = p_slot for update;
  if s.id is null or s.booked then raise exception 'book.taken'; end if;
  update slots set booked = true where id = p_slot;
  insert into appointments (slot_id, doctor_id, patient_id, starts_at, minutes, type, note)
  values (s.id, s.doctor_id, auth.uid(), s.starts_at, s.minutes, p_type, p_note) returning * into a;
  return a;
end $$;

create or replace function public.cancel_appointment(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a appointments;
begin
  select * into a from appointments where id = p_id and (patient_id = auth.uid() or doctor_id = auth.uid());
  if a.id is null then raise exception 'not allowed'; end if;
  update appointments set status = 'cancelled' where id = p_id;
  update slots set booked = false where id = a.slot_id;
  insert into notifications (user_id, type, data, link)
  values (case when auth.uid() = a.patient_id then a.doctor_id else a.patient_id end, 'appointment_cancelled',
          jsonb_build_object('name', (select full_name from profiles where id = auth.uid()), 'starts_at', a.starts_at),
          case when auth.uid() = a.patient_id then '/doctor/agenda' else '/home' end);
end $$;

create or replace function public.delete_my_account()
returns void language sql security definer set search_path = public, auth as $$
  delete from auth.users where id = auth.uid();
$$;

-- =====================================================================
-- Automatic notifications
-- =====================================================================
create or replace function public.notify_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, type, data, link) values (new.doctor_id, 'review_requested',
      jsonb_build_object('patient_name', (select full_name from profiles where id = new.patient_id), 'marker_code', new.marker_code),
      '/doctor/queue/' || new.id);
  elsif new.status = 'answered' and old.status = 'open' then
    insert into notifications (user_id, type, data, link) values (new.patient_id, 'review_answered',
      jsonb_build_object('doctor_name', (select full_name from profiles where id = new.doctor_id), 'marker_code', new.marker_code),
      '/marker/' || new.marker_code);
  end if;
  return new;
end $$;
drop trigger if exists review_notify on public.review_requests;
create trigger review_notify after insert or update on public.review_requests
  for each row execute function public.notify_review();

create or replace function public.notify_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, data, link) values (new.doctor_id, 'appointment_booked',
    jsonb_build_object('patient_name', (select full_name from profiles where id = new.patient_id),
                       'starts_at', new.starts_at, 'type', new.type), '/doctor/agenda');
  return new;
end $$;
drop trigger if exists appt_notify on public.appointments;
create trigger appt_notify after insert on public.appointments
  for each row execute function public.notify_appointment();

-- live updates in the app
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;

-- =====================================================================
-- Private storage for lab report files: <user id>/<file>
-- =====================================================================
insert into storage.buckets (id, name, public) values ('lab-reports', 'lab-reports', false)
on conflict (id) do nothing;

drop policy if exists "reports owner" on storage.objects;
create policy "reports owner" on storage.objects for all to authenticated
  using (bucket_id = 'lab-reports' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'lab-reports' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "reports shared doctor" on storage.objects;
create policy "reports shared doctor" on storage.objects for select to authenticated
  using (bucket_id = 'lab-reports' and public.has_active_share(((storage.foldername(name))[1])::uuid, auth.uid()));
