-- GiGi admin: approve or reject doctors from the app (/admin).
-- Admins are listed in public.admins. Ste's account is added by the SHA-256 of her e-mail,
-- so no e-mail address is written in this public repository.
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz default now()
);
alter table public.admins enable row level security;   -- no policies: only the functions below read it

alter table public.doctors add column if not exists review_status text not null default 'pending'
  check (review_status in ('pending','approved','rejected'));
update public.doctors set review_status = 'approved' where verified and review_status = 'pending';

-- The founder's e-mail is stored only as a SHA-256 hash (other admins: updates/2026-10-29_admin_team.sql).
-- Admin e-mails are stored only as SHA-256 hashes. Anyone who signs up (now or later)
-- with one of these e-mails becomes a GiGi admin automatically.
create table if not exists public.admin_email_hashes (hash text primary key);
alter table public.admin_email_hashes enable row level security;  -- no policies: nobody reads it from the app
insert into public.admin_email_hashes (hash) values ('cae76e9e41696da64745f0f77871162f597d8dc5a70fafb79a4f7153a651177c') on conflict do nothing;

create or replace function public.email_is_admin(p_email text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from admin_email_hashes where hash = encode(extensions.digest(lower(p_email), 'sha256'), 'hex'));
$$;

insert into public.admins (user_id)
select id from auth.users where public.email_is_admin(email)
on conflict do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create or replace function public.admin_list_doctors()
returns table (id uuid, full_name text, email text, specialty text, area text, languages text[],
               consultation text, first_visit_fee numeric, bio text, review_status text, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select d.id, p.full_name, u.email::text, d.specialty, d.area, d.languages, d.consultation,
           d.first_visit_fee, d.bio, d.review_status, p.created_at
    from doctors d join profiles p on p.id = d.id join auth.users u on u.id = d.id
    order by p.created_at desc;
end $$;

create or replace function public.admin_set_doctor(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_status not in ('approved','rejected','pending') then raise exception 'bad status'; end if;
  update doctors set review_status = p_status, verified = (p_status = 'approved') where id = p_id;
  if p_status in ('approved','rejected') then
    insert into notifications (user_id, type, data, link)
    values (p_id, 'doctor_' || p_status,
            jsonb_build_object('name', (select full_name from profiles where id = p_id)),
            case when p_status = 'approved' then '/doctor/agenda' else '/doctor/profile' end);
  end if;
end $$;

-- New account: profile, doctor row, welcome message, and (for doctors) a heads-up to every admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := case when new.raw_user_meta_data->>'role' = 'doctor' then 'doctor' else 'patient' end;
begin
  insert into profiles (id, role, full_name, language, consent_at)
  values (new.id, v_role, new.raw_user_meta_data->>'full_name',
          coalesce(new.raw_user_meta_data->>'language','en'), now());
  if v_role = 'doctor' then insert into doctors (id) values (new.id); end if;
  if public.email_is_admin(new.email) then
    insert into admins (user_id) values (new.id) on conflict do nothing;
  end if;
  insert into notifications (user_id, type, data, link)
  values (new.id, case when v_role = 'doctor' then 'welcome_doctor' else 'welcome' end,
          jsonb_build_object('name', new.raw_user_meta_data->>'full_name'),
          case when v_role = 'doctor' then '/doctor/profile' else '/add' end);
  if v_role = 'doctor' then
    insert into notifications (user_id, type, data, link)
    select a.user_id, 'doctor_signup', jsonb_build_object('name', new.raw_user_meta_data->>'full_name'), '/admin'
    from admins a;
  end if;
  return new;
end $$;
