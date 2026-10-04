-- noahdarwinlee.com — the message box on the front page.
--
-- Paste this into the SQL editor of the Supabase project the site already uses
-- (the citylayoutguessr one, kigvciyyjlgjcgnwgrwf) and run it once. Safe to run
-- again: the table is created only if it is missing, and the policy is dropped
-- before it is recreated.
--
-- One table, write-only from the outside: anyone may add a message, nobody may
-- read one back through the site's key. You read them in the dashboard, under
-- Table Editor -> feedback, or with the view at the bottom.

create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  message    text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "anyone may leave feedback" on public.feedback;
create policy "anyone may leave feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (char_length(message) between 1 and 2000);

-- No select, update or delete for anything that reaches a browser.
revoke select, update, delete on public.feedback from anon, authenticated;

-- Newest first, for reading in the SQL editor: select * from public.feedback_latest;
create or replace view public.feedback_latest
  with (security_invoker = true) as
  select created_at, message from public.feedback order by created_at desc;
revoke all on public.feedback_latest from anon, authenticated;
