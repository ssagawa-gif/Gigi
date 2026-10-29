-- GiGi team: admins add or remove other admins by e-mail from the app (Admin > GiGi team).
-- The founder (e-mail stored only as a hash in admin_email_hashes) can never be removed,
-- so the team can't lock itself out.
create table if not exists public.admin_invites (
  email text primary key check (email = lower(email)),
  added_by uuid references auth.users on delete set null,
  created_at timestamptz default now()
);
alter table public.admin_invites enable row level security;  -- no policies: only the functions below

create or replace function public.email_is_founder(p_email text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from admin_email_hashes where hash = encode(extensions.digest(lower(p_email), 'sha256'), 'hex'));
$$;

-- an e-mail is admin if it is the founder or was invited by an admin
create or replace function public.email_is_admin(p_email text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select public.email_is_founder(p_email)
      or exists (select 1 from admin_invites where email = lower(p_email));
$$;

create or replace function public.admin_list_team()
returns table (email text, has_account boolean, is_me boolean, is_founder boolean, added_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    with people as (
      select lower(u.email::text) as em, a.created_at as added_at from admins a join auth.users u on u.id = a.user_id
      union
      select i.email as em, i.created_at from admin_invites i
    )
    select p.em,
           exists (select 1 from auth.users u where lower(u.email) = p.em),
           p.em = (select lower(me.email::text) from auth.users me where me.id = auth.uid()),
           public.email_is_founder(p.em),
           min(p.added_at)
    from people p group by p.em order by min(p.added_at);
end $$;

create or replace function public.admin_add(p_email text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_email text := lower(trim(p_email)); v_user uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  insert into admin_invites (email, added_by) values (v_email, auth.uid()) on conflict do nothing;
  select u.id into v_user from auth.users u where lower(u.email) = v_email;
  if v_user is not null then
    insert into admins (user_id) values (v_user) on conflict do nothing;
    insert into notifications (user_id, type, data, link)
    values (v_user, 'admin_added', jsonb_build_object('name', (select full_name from profiles where id = v_user)), '/admin');
  end if;
end $$;

create or replace function public.admin_remove(p_email text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_email text := lower(trim(p_email));
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if public.email_is_founder(v_email) then raise exception 'cannot remove founder'; end if;
  if v_email = (select lower(me.email::text) from auth.users me where me.id = auth.uid()) then raise exception 'cannot remove yourself'; end if;
  delete from admin_invites where email = v_email;
  delete from admins where user_id in (select u.id from auth.users u where lower(u.email) = v_email);
end $$;
