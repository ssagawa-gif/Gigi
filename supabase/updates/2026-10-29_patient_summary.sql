-- Patient summary for doctors: the patient's health insurance (optional, typed by the patient).
alter table public.profiles add column if not exists insurer text;
grant update (insurer) on public.profiles to authenticated;
