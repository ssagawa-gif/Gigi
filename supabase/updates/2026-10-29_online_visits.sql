-- Online-only visits for now. Each appointment gets a video link: the doctor's own fixed link
-- (Google Meet / Zoom / Teams) if set in their profile, otherwise a free, unique Jitsi room.
-- The patient gets a confirmation (app + e-mail with the link and "add to calendar").
alter table public.doctors add column if not exists meeting_url text;
grant update (meeting_url) on public.doctors to authenticated;
alter table public.doctors alter column consultation set default 'video';
update public.doctors set consultation = 'video' where consultation is distinct from 'video';

alter table public.appointments add column if not exists meeting_url text;

create or replace function public.book_slot(p_slot uuid, p_type text, p_note text)
returns public.appointments language plpgsql security definer set search_path = public as $$
declare s slots; a appointments; v_link text;
begin
  select * into s from slots where id = p_slot for update;
  if s.id is null or s.booked then raise exception 'book.taken'; end if;
  select nullif(trim(meeting_url), '') into v_link from doctors where id = s.doctor_id;
  if v_link is null then
    v_link := 'https://meet.jit.si/GiGi-' || replace(gen_random_uuid()::text, '-', '');
  end if;
  update slots set booked = true where id = p_slot;
  insert into appointments (slot_id, doctor_id, patient_id, starts_at, minutes, type, note, meeting_url)
  values (s.id, s.doctor_id, auth.uid(), s.starts_at, s.minutes, p_type, p_note, v_link) returning * into a;
  return a;
end $$;

create or replace function public.notify_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_doc text := (select full_name from profiles where id = new.doctor_id);
        v_pat text := (select full_name from profiles where id = new.patient_id);
begin
  -- doctor: new booking
  insert into notifications (user_id, type, data, link) values (new.doctor_id, 'appointment_booked',
    jsonb_build_object('patient_name', v_pat, 'doctor_name', v_doc, 'starts_at', new.starts_at, 'minutes', new.minutes,
                       'type', new.type, 'meeting_url', new.meeting_url, 'appointment_id', new.id), '/doctor/agenda');
  -- patient: confirmation with the video link
  insert into notifications (user_id, type, data, link) values (new.patient_id, 'appointment_confirmed',
    jsonb_build_object('doctor_name', v_doc, 'patient_name', v_pat, 'starts_at', new.starts_at, 'minutes', new.minutes,
                       'type', new.type, 'meeting_url', new.meeting_url, 'appointment_id', new.id), '/booked/' || new.id);
  return new;
end $$;
