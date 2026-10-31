-- Context used to judge a result: cycle phase / cycle day (reproductive hormones), age (AMH),
-- and where the range came from ('lab' report, 'gigi' standard, or typed 'manual').
alter table public.results add column if not exists context jsonb;
