-- citylayoutguessr — everything the site needs from Supabase.
--
-- Paste this whole file into the Supabase SQL editor and run it once. It is
-- written to be safe to run again: every object is created only if it is
-- missing, and every policy is dropped before it is recreated.
--
-- Three tables:
--   profiles      one row per signed-in player: the name and picture shown on
--                 the board. Public to read, yours alone to change.
--   daily_scores  one row per player per day, written once and never edited.
--                 Public to read, which is what makes a leaderboard possible.
--   events        visits and logins. Anyone may add a row; nobody may read one
--                 through the API. You read them in the dashboard, where the
--                 service role bypasses row-level security.
--
-- The day is always the date in US Eastern, computed here on the server, so a
-- player in Tokyo and a player in New York are on the same puzzle and nobody
-- can post a score to yesterday.


-- ------------------------------------------------------------------ grants --
--
-- Row-level security decides which ROWS a request may touch. This decides
-- whether the roles a browser arrives as may touch the TABLE at all, and it is
-- a separate thing: without it every request comes back "permission denied for
-- table ...", policies or no policies. Supabase grants these automatically for
-- tables made through the dashboard; one made by running SQL may not have them.
--
-- anon          nobody is signed in
-- authenticated somebody is
--
-- Safe to run again, and safe to run before the tables exist further down —
-- so these are repeated at the end of the file, where they will take.

grant usage on schema public to anon, authenticated;


-- ---------------------------------------------------------------- profiles --

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "you may create your own profile" on public.profiles;
create policy "you may create your own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "you may edit your own profile" on public.profiles;
create policy "you may edit your own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- A profile is created the moment someone signs in, from whatever Google gave
-- us. security definer because the trigger runs before the new user can act
-- for themselves.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'player'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ------------------------------------------------------------ daily_scores --

-- The day the server thinks it is, in the zone the game runs on.
create or replace function public.game_day()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/New_York')::date;
$$;

create table if not exists public.daily_scores (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users on delete cascade,
  day         date not null,
  correct     smallint not null,
  total       smallint not null,
  duration_ms integer,
  created_at  timestamptz not null default now(),
  constraint daily_scores_one_per_day unique (user_id, day),
  constraint daily_scores_sane check (
    total = 10 and correct >= 0 and correct <= total
  )
);

create index if not exists daily_scores_day_rank
  on public.daily_scores (day, correct desc, created_at asc);

alter table public.daily_scores enable row level security;

drop policy if exists "scores are readable by everyone" on public.daily_scores;
create policy "scores are readable by everyone"
  on public.daily_scores for select
  using (true);

-- You may post your own score, for today, once. There is deliberately no
-- update and no delete policy: a row, once written, stands.
drop policy if exists "you may post your own score for today" on public.daily_scores;
create policy "you may post your own score for today"
  on public.daily_scores for insert
  with check (auth.uid() = user_id and day = public.game_day());

-- What the page reads for the board. security_invoker so the reader's own
-- permissions apply rather than the view owner's.
create or replace view public.daily_board
with (security_invoker = true)
as
  select
    s.day,
    s.correct,
    s.created_at,
    s.user_id,
    coalesce(p.display_name, 'player') as display_name,
    p.avatar_url,
    rank() over (
      partition by s.day
      order by s.correct desc, s.created_at asc
    ) as place
  from public.daily_scores s
  left join public.profiles p on p.id = s.user_id;


-- Every day added up. Ranked on the total, and where two people have the same
-- total the one who needed fewer days to get there is ahead; the earliest score
-- breaks a remaining tie.
create or replace view public.lifetime_board
with (security_invoker = true)
as
  select
    s.user_id,
    coalesce(p.display_name, 'player') as display_name,
    p.avatar_url,
    sum(s.correct)::int as total,
    count(*)::int      as days,
    rank() over (
      order by sum(s.correct) desc, count(*) asc, min(s.created_at) asc
    ) as place
  from public.daily_scores s
  left join public.profiles p on p.id = s.user_id
  group by s.user_id, p.display_name, p.avatar_url;


-- ------------------------------------------------------------------ events --

create table if not exists public.events (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('visit', 'login', 'game_start', 'game_finish')),
  user_id    uuid references auth.users on delete set null,
  day        date not null default public.game_day(),
  path       text,
  referrer   text,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_day_kind on public.events (day, kind);

alter table public.events enable row level security;

-- Write-only from the outside: anyone may add a row, and there is no select
-- policy, so no key that reaches a browser can read the table back.
drop policy if exists "anyone may record an event" on public.events;
create policy "anyone may record an event"
  on public.events for insert
  with check (
    (user_id is null or user_id = auth.uid())
    and day = public.game_day()
    and length(coalesce(path, '')) < 300
    and length(coalesce(referrer, '')) < 300
  );

-- Your dashboard views. The service role and the SQL editor bypass row-level
-- security, so these are for you, not for the site.
create or replace view public.stats_by_day as
  select
    day,
    count(*) filter (where kind = 'visit')        as visits,
    count(*) filter (where kind = 'login')        as logins,
    count(*) filter (where kind = 'game_start')   as games_started,
    count(*) filter (where kind = 'game_finish')  as games_finished,
    count(distinct user_id) filter (where user_id is not null) as signed_in_people
  from public.events
  group by day
  order by day desc;

create or replace view public.stats_summary as
  select
    (select count(*) from auth.users)                          as accounts,
    (select count(*) from public.daily_scores)                 as daily_scores_posted,
    (select count(*) from public.events where kind = 'visit')  as visits_all_time,
    (select count(*) from public.events
       where kind = 'visit' and day = public.game_day())       as visits_today;


-- ------------------------------------------------------------------ grants --
-- The table-level half of the permissions, now that the tables and views all
-- exist. What each role may attempt; the policies above decide the rest.

grant select                 on public.profiles      to anon, authenticated;
grant insert                 on public.profiles      to authenticated;

-- Column-level: a signed-in person may change the name on their own row and
-- nothing else. Without this they could also rewrite avatar_url, which every
-- other player's browser then loads as an image — an arbitrary URL pointed at
-- everyone who opens the board.
revoke update on public.profiles from authenticated;
grant update (display_name)  on public.profiles      to authenticated;

grant select                 on public.daily_scores  to anon, authenticated;
grant insert                 on public.daily_scores  to authenticated;

grant insert                 on public.events        to anon, authenticated;

grant select                 on public.daily_board   to anon, authenticated;
grant select                 on public.lifetime_board to anon, authenticated;

-- Deliberately not granted: any delete or update on daily_scores (a posted
-- score stands), and any select on events (nothing that reaches a browser can
-- read the counters back).


-- ------------------------------------------------------------ tightening --

-- A name is shown on a public board, so it is kept to a sane length and free
-- of control characters — which can reorder or hide the text around them.
-- 60 rather than 24: the name Google supplies on sign-up has to fit too, or
-- the trigger above would fail and nobody could sign in. The rename box in the
-- page asks for 24.
alter table public.profiles drop constraint if exists profiles_name_sane;
alter table public.profiles
  add constraint profiles_name_sane
  check (
    display_name is null
    or (char_length(display_name) between 1 and 60
        and display_name !~ '[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e]')
  )
  not valid;

-- The stats views are yours alone. They are read with the owner's rights, and
-- stats_summary counts rows in auth.users, so nothing that reaches a browser
-- should be able to select from them. Supabase grants new objects to anon and
-- authenticated by default in some projects; this takes that back.
revoke all on public.stats_by_day  from anon, authenticated;
revoke all on public.stats_summary from anon, authenticated;

-- The sign-up trigger's function runs with the owner's rights, so nothing that
-- reaches a browser should be able to call it directly. game_day() is left
-- callable on purpose: the insert policies above evaluate it as the caller, and
-- revoking it would stop anyone posting a score.
revoke all on function public.handle_new_user() from anon, authenticated;
