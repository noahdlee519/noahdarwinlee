-- CHRONIA's reports, from anyone signed in with Google (no longer the fact checkers' shared password):
-- each report keeps the account it came from, so a day's reports can be counted per account (50 a day,
-- counted by the chronia-report function). Reports sent before this have no account. Safe to run twice.
alter table public.chronia_reports add column if not exists user_id uuid;
alter table public.chronia_reports add column if not exists email text not null default '' check (char_length(email) <= 320);
create index if not exists chronia_reports_user_day on public.chronia_reports (user_id, created_at desc);
