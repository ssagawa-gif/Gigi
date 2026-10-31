-- Red "urgent" seal: the patient app copies the result's urgency into the review request
-- so the doctor's queue can show it and put it first. Safe to re-run.
alter table public.review_requests add column if not exists urgency text;
do $$ begin
  alter table public.review_requests add constraint review_requests_urgency_check check (urgency in ('today','days'));
exception when duplicate_object then null; end $$;

create or replace function public.notify_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, type, data, link) values (new.doctor_id, 'review_requested',
      jsonb_build_object('patient_name', (select full_name from profiles where id = new.patient_id), 'marker_code', new.marker_code, 'urgency', new.urgency),
      '/doctor/queue/' || new.id);
  elsif new.status = 'answered' and old.status = 'open' then
    insert into notifications (user_id, type, data, link) values (new.patient_id, 'review_answered',
      jsonb_build_object('doctor_name', (select full_name from profiles where id = new.doctor_id), 'marker_code', new.marker_code),
      '/marker/' || new.marker_code);
  end if;
  return new;
end $$;
