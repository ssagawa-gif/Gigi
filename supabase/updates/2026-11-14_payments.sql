-- 14 Nov 2026 · Payments with Stripe Connect (Ste: 10% commission, patient pays when booking,
-- full refund if she cancels more than 24 h before, doctor is paid after the visit). Safe to re-run.
-- Nothing changes until STRIPE_SECRET_KEY is set and a doctor finishes the Stripe onboarding.

-- Doctor's connected Stripe account: private to the doctor (patients only see doctors.payments_ready)
create table if not exists public.doctor_payouts (
  doctor_id uuid primary key references public.doctors on delete cascade,
  stripe_account_id text not null,
  ready boolean not null default false,
  updated_at timestamptz default now()
);
alter table public.doctor_payouts enable row level security;
drop policy if exists payouts_own on public.doctor_payouts;
create policy payouts_own on public.doctor_payouts for select to authenticated using (doctor_id = auth.uid());
-- set only by the payments function (service role); not in the doctors' update grant
alter table public.doctors add column if not exists payments_ready boolean not null default false;

-- Appointments: a booking waits for payment (slot held 30 min), then becomes 'booked'
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check check (status in ('booked','cancelled','pending_payment'));
alter table public.appointments add column if not exists price_cents int;
alter table public.appointments add column if not exists fee_cents int;            -- GiGi's 10 %
alter table public.appointments add column if not exists currency text;
alter table public.appointments add column if not exists payment_status text;      -- pending | paid | refunded | transferred
alter table public.appointments add column if not exists stripe_session text;
alter table public.appointments add column if not exists stripe_payment_intent text;
alter table public.appointments add column if not exists stripe_charge text;
alter table public.appointments add column if not exists stripe_transfer text;
alter table public.appointments add column if not exists hold_until timestamptz;
alter table public.appointments add column if not exists paid_at timestamptz;
alter table public.appointments add column if not exists refunded_at timestamptz;
alter table public.appointments add column if not exists transferred_at timestamptz;

-- Notifications: send the "booked" messages when the visit is really booked (now, or once paid)
create or replace function public.notify_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_doc text := (select full_name from profiles where id = new.doctor_id);
        v_pat text := (select full_name from profiles where id = new.patient_id);
begin
  if new.status <> 'booked' or (tg_op = 'UPDATE' and old.status = 'booked') then return new; end if;
  insert into notifications (user_id, type, data, link) values (new.doctor_id, 'appointment_booked',
    jsonb_build_object('patient_name', v_pat, 'doctor_name', v_doc, 'starts_at', new.starts_at, 'minutes', new.minutes,
                       'type', new.type, 'meeting_url', new.meeting_url, 'appointment_id', new.id,
                       'paid', new.payment_status = 'paid', 'price_cents', new.price_cents), '/doctor/agenda');
  insert into notifications (user_id, type, data, link) values (new.patient_id, 'appointment_confirmed',
    jsonb_build_object('doctor_name', v_doc, 'patient_name', v_pat, 'starts_at', new.starts_at, 'minutes', new.minutes,
                       'type', new.type, 'meeting_url', new.meeting_url, 'appointment_id', new.id,
                       'paid', new.payment_status = 'paid', 'price_cents', new.price_cents), '/booked/' || new.id);
  return new;
end $$;
drop trigger if exists appt_notify on public.appointments;
create trigger appt_notify after insert or update of status on public.appointments
  for each row execute function public.notify_appointment();

-- Free booking stays as it was, but a doctor who takes payments can only be booked through checkout
create or replace function public.book_slot(p_slot uuid, p_type text, p_note text)
returns public.appointments language plpgsql security definer set search_path = public as $$
declare s slots; a appointments; v_link text;
begin
  select * into s from slots where id = p_slot for update;
  if s.id is null or s.booked then raise exception 'book.taken'; end if;
  if (select payments_ready from doctors where id = s.doctor_id) then raise exception 'book.payFirst'; end if;
  select nullif(trim(meeting_url), '') into v_link from doctors where id = s.doctor_id;
  if v_link is null then v_link := 'https://meet.jit.si/GiGi-' || replace(gen_random_uuid()::text, '-', ''); end if;
  update slots set booked = true where id = p_slot;
  insert into appointments (slot_id, doctor_id, patient_id, starts_at, minutes, type, note, meeting_url)
  values (s.id, s.doctor_id, auth.uid(), s.starts_at, s.minutes, p_type, p_note, v_link) returning * into a;
  return a;
end $$;

-- A paid visit is cancelled through the payments function (it handles the refund)
create or replace function public.cancel_appointment(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a appointments;
begin
  select * into a from appointments where id = p_id and (patient_id = auth.uid() or doctor_id = auth.uid());
  if a.id is null then raise exception 'not allowed'; end if;
  if a.payment_status = 'paid' then raise exception 'cancel.usePayments'; end if;
  update appointments set status = 'cancelled' where id = p_id;
  update slots set booked = false where id = a.slot_id;
  insert into notifications (user_id, type, data, link)
  values (case when auth.uid() = a.patient_id then a.doctor_id else a.patient_id end, 'appointment_cancelled',
          jsonb_build_object('name', (select full_name from profiles where id = auth.uid()), 'starts_at', a.starts_at),
          case when auth.uid() = a.patient_id then '/doctor/agenda' else '/home' end);
end $$;

-- Free held slots whose payment never came (also done by the Stripe "expired" event)
create or replace function public.release_unpaid_holds()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with gone as (
    update appointments set status = 'cancelled', payment_status = 'expired'
    where status = 'pending_payment' and hold_until < now() returning slot_id)
  update slots set booked = false where id in (select slot_id from gone);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.release_unpaid_holds() from public, anon, authenticated;

-- Every hour: free expired holds, and ask the payouts function to pay doctors for visits that are over
do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname in ('gigi_release_holds', 'gigi_payouts');
  perform cron.schedule('gigi_release_holds', '*/15 * * * *', 'select public.release_unpaid_holds()');
  -- the payouts function only pays visits that are over and paid, once each: safe to call any time
  perform cron.schedule('gigi_payouts', '5 * * * *',
    $c$select net.http_post(url := 'https://vnalhjesbjjdslbwchjg.supabase.co/functions/v1/payouts', body := '{}'::jsonb, headers := '{"Content-Type":"application/json"}'::jsonb)$c$);
exception when others then raise notice 'pg_cron not available: %', sqlerrm;
end $$;
