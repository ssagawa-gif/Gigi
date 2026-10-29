-- E-mail for every new notification, without any dashboard setup.
-- A trigger calls the notify-email Edge Function with ONLY the notification id; the
-- function reads the row itself and marks it as e-mailed, so nobody can spoof or replay
-- e-mails by calling the function URL directly.
create extension if not exists pg_net with schema extensions;
alter table public.notifications add column if not exists emailed_at timestamptz;

create or replace function public.email_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://vnalhjesbjjdslbwchjg.supabase.co/functions/v1/notify-email',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  return new; -- never block the app if e-mail is down
end $$;

drop trigger if exists notifications_email on public.notifications;
create trigger notifications_email after insert on public.notifications
  for each row execute function public.email_notification();
