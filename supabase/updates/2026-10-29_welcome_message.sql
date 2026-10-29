-- Update for projects that already ran schema.sql before 29 Oct 2026:
-- adds the welcome message (in-app + e-mail) when someone creates an account.
-- Run once in Supabase > SQL Editor > New query > Run.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := case when new.raw_user_meta_data->>'role' = 'doctor' then 'doctor' else 'patient' end;
begin
  insert into profiles (id, role, full_name, language, consent_at)
  values (new.id, v_role, new.raw_user_meta_data->>'full_name',
          coalesce(new.raw_user_meta_data->>'language','en'), now());
  if v_role = 'doctor' then insert into doctors (id) values (new.id); end if;
  -- Welcome message: shows in the app's bell and is e-mailed by the notify-email function
  insert into notifications (user_id, type, data, link)
  values (new.id, case when v_role = 'doctor' then 'welcome_doctor' else 'welcome' end,
          jsonb_build_object('name', new.raw_user_meta_data->>'full_name'),
          case when v_role = 'doctor' then '/doctor/profile' else '/add' end);
  return new;
end $$;
