-- noahdarwinlee.com -- the message boxes on the front page (under about) and
-- the art page. feedback.js sends to this table.
--
-- It lives in the site's own Supabase project, the one citylayoutguessr uses
-- (kigvciyyjlgjcgnwgrwf). Paste all of this into that project's SQL Editor and
-- press Run, once. Safe to run again: the table is created only if it is
-- missing, and the policy is dropped before it is recreated.
--
-- One table, write-only from the outside: anyone may add a message, nobody may
-- read one back through the site's key. Read them in the dashboard, under
-- Table Editor -> site_feedback, or in the SQL editor with
--   select * from public.site_feedback_latest;

create table if not exists public.site_feedback (
  id         bigint generated always as identity primary key,
  page       text not null default 'about' check (page in ('about', 'art', 'projects', 'blog', 'cv')),
  message    text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.site_feedback enable row level security;

drop policy if exists "anyone may leave site feedback" on public.site_feedback;
create policy "anyone may leave site feedback"
  on public.site_feedback for insert
  to anon, authenticated
  with check (char_length(message) between 1 and 2000);

-- A browser may add the page and the message, and nothing else.
revoke all on public.site_feedback from anon, authenticated;
grant insert (page, message) on public.site_feedback to anon, authenticated;

-- Newest first, for reading in the SQL editor.
create or replace view public.site_feedback_latest
  with (security_invoker = true) as
  select created_at, page, message from public.site_feedback order by created_at desc;
revoke all on public.site_feedback_latest from anon, authenticated;

-- Added 6 October 2026, when projects, blog and cv got the box too. For a
-- table made before then, this widens the list of pages:
alter table public.site_feedback drop constraint if exists site_feedback_page_check;
alter table public.site_feedback add constraint site_feedback_page_check
  check (page in ('about', 'art', 'projects', 'blog', 'cv'));
