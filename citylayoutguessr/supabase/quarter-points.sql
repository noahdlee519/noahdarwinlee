-- citylayoutguessr — quarter points on the daily board.
--
-- Run this once in the Supabase SQL editor, after schema.sql and names.sql.
-- Paste the whole file, press run. It is safe to run twice.
--
-- What changes: a daily score used to be a count of cities, 0 to 10. It is now
-- a score in quarters — a quarter each for the continent, the region, the
-- country and the city — so 7.25 and 7.5 are real scores and the column has to
-- hold them. Scores posted before today were whole cities, which are whole
-- points, so they stay exactly as they are and go on ranking correctly.

-- 1. The column. numeric(4,2) holds 0 through 10 in quarters with room to
--    spare; the old smallint values convert without loss.
alter table public.daily_scores
  drop constraint if exists daily_scores_sane;

alter table public.daily_scores
  alter column correct type numeric(4,2) using correct::numeric(4,2);

-- Still a score out of ten, still not negative, and still landing on a
-- quarter — a score that is not a multiple of 0.25 did not come from the game.
alter table public.daily_scores
  add constraint daily_scores_sane check (
    total = 10
    and correct >= 0
    and correct <= total
    and correct * 4 = round(correct * 4)
  );

-- 2. The boards. Both are rebuilt so the totals come back as numbers with
--    their quarters intact rather than being cut down to whole ones. These
--    are the definitions from names.sql with the one cast changed, so a
--    hidden player stays hidden.
create or replace view public.daily_board
with (security_invoker = true)
as
  select
    s.day,
    s.correct,
    s.created_at,
    s.user_id,
    case when coalesce(p.hidden, false) then 'player'
         else coalesce(p.display_name, 'player') end as display_name,
    case when coalesce(p.hidden, false) then null else p.avatar_url end as avatar_url,
    rank() over (
      partition by s.day
      order by s.correct desc, s.created_at asc
    ) as place
  from public.daily_scores s
  left join public.profiles p on p.id = s.user_id;

create or replace view public.lifetime_board
with (security_invoker = true)
as
  select
    s.user_id,
    case when coalesce(p.hidden, false) then 'player'
         else coalesce(p.display_name, 'player') end as display_name,
    case when coalesce(p.hidden, false) then null else p.avatar_url end as avatar_url,
    sum(s.correct)::numeric(6,2) as total,
    count(*)::int                as days,
    rank() over (
      order by sum(s.correct) desc, count(*) asc, min(s.created_at) asc
    ) as place
  from public.daily_scores s
  left join public.profiles p on p.id = s.user_id
  group by s.user_id, p.display_name, p.avatar_url, p.hidden;

grant select on public.daily_board, public.lifetime_board to anon, authenticated;
