-- citylayoutguessr — keeping the board's names civil.
--
-- Three parts, in order of how much they can be trusted:
--
--   1. a normaliser, so "f4ck" and "f.u.c.k" are read the same as the word
--      itself and the list does not have to enumerate every spelling;
--   2. a list you can edit, checked by a trigger on every insert and update,
--      so a name is refused at the database and not merely in the page;
--   3. a switch you can flip on any row, because no list catches everything
--      and the fastest fix for a name someone worked hard on is your own hand.
--
-- Run this after schema.sql. Safe to run again.


-- ------------------------------------------------------- 1. normalising --

-- Lowercase, common letter-for-number swaps undone, accents folded, and
-- anything that is not a letter or a space dropped. "Nöah_D33" -> "noah dee".
create or replace function public.name_key(txt text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(
    regexp_replace(
      translate(
        translate(lower(coalesce(txt, '')), '0134578@$!', 'oieastbasi'),
        'àáâãäåèéêëìíîïòóôõöùúûüñç',
        'aaaaaaeeeeiiiiooooouuuunc'
      ),
      '[^a-z ]', '', 'g'
    ),
    ' +', ' ', 'g'
  ));
$$;


-- ------------------------------------------------------------ 2. the list --

-- whole_word = true   only counts as a match on its own, so Cassandra and
--                     Scunthorpe keep their names.
-- whole_word = false  counts anywhere in the name, for things that are never
--                     an innocent part of another word.
create table if not exists public.banned_words (
  word       text primary key,
  whole_word boolean not null default false,
  note       text
);

alter table public.banned_words enable row level security;
-- No policies and no grants: nothing that reaches a browser can read this list,
-- let alone add to it. You edit it in the dashboard.
revoke all on public.banned_words from anon, authenticated;

insert into public.banned_words (word, whole_word, note) values
  ('fuck', false, null),
  ('shit', true, 'whole word: "shitake", place names'),
  ('cunt', false, null),
  ('bitch', false, null),
  ('bastard', false, null),
  ('wanker', false, null),
  ('dick', true, 'whole word: it is also a name'),
  ('cock', true, 'whole word: cockburn, cockerel'),
  ('penis', false, null),
  ('vagina', false, null),
  ('anus', true, null),
  ('ass', true, 'whole word: cassandra, assam, embassy'),
  ('arse', false, null),
  ('slut', false, null),
  ('whore', false, null),
  ('rape', true, 'whole word: grape, drape, rapeseed'),
  ('nazi', false, null),
  ('hitler', false, null),
  ('nigg', false, 'the root, so the spellings do not each need a line'),
  ('faggot', false, null),
  ('fagg', false, null),
  ('retard', false, null),
  ('tranny', false, null),
  ('kkk', false, null),
  -- Spellings the normaliser cannot reach on its own: it turns 4 into a, so
  -- "f4ck" reads as "fack" rather than the word meant by it.
  ('fck', false, null),
  ('fuk', false, null),
  ('fuq', false, null),
  ('fack', false, null),
  ('phuck', false, null),
  ('dickhead', false, null),
  ('dickface', false, null),
  ('twat', false, null),
  ('prick', true, 'whole word: pricked, prickly'),
  ('wank', false, null),
  ('pussy', false, null),
  ('porn', false, null),
  ('dildo', false, null),
  ('jizz', false, null),
  ('turd', false, null),
  ('shite', false, null),
  ('cum', true, 'whole word: cumbria, circumference'),
  ('sex', true, 'whole word: sussex, essex, middlesex'),
  ('anal', true, 'whole word: analysis, canal'),
  ('admin', true, 'not rude, but not yours to claim'),
  ('moderator', true, null),
  ('citylayoutguessr', true, null)
on conflict (word) do nothing;

-- Innocent words that would otherwise trip a substring rule. Checked first.
create table if not exists public.allowed_words (
  word text primary key
);

alter table public.allowed_words enable row level security;
revoke all on public.allowed_words from anon, authenticated;

insert into public.allowed_words (word) values
  ('scunthorpe'), ('penistone'), ('lightwater'), ('assange'), ('cassandra'),
  ('classic'), ('grape'), ('therapist'), ('cockburn'), ('hancock')
on conflict (word) do nothing;


-- Returns true if a name should be refused.
create or replace function public.name_is_banned(txt text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  nkey      text := public.name_key(txt);
  squashed  text := replace(public.name_key(txt), ' ', '');
  w         record;
begin
  if nkey = '' then
    return false;
  end if;

  -- A name that is entirely an innocent word is let through whatever it
  -- happens to contain.
  if exists (select 1 from public.allowed_words a where a.word = squashed) then
    return false;
  end if;

  for w in select word, whole_word from public.banned_words loop
    if w.whole_word then
      if nkey ~ ('(^| )' || w.word || '( |$)') then
        return true;
      end if;
    else
      if position(w.word in squashed) > 0 then
        return true;
      end if;
    end if;
  end loop;

  return false;
end;
$$;

revoke all on function public.name_is_banned(text) from anon, authenticated;


-- The trigger. On a rename it refuses, so the page can say so; on the row
-- created at sign-up it quietly substitutes, because nobody should be locked
-- out of signing in over the name their Google account happens to carry.
create or replace function public.check_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.display_name is not null and public.name_is_banned(new.display_name) then
    if tg_op = 'INSERT' then
      new.display_name := 'player';
    else
      raise exception 'that name is not allowed'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_name_check on public.profiles;
create trigger profiles_name_check
  before insert or update of display_name on public.profiles
  for each row execute function public.check_display_name();


-- ------------------------------------------------------- 3. your own hand --

-- The backstop. Flip this on a row in the Table Editor and that player shows
-- as "player" with no picture, everywhere, immediately. Nothing in the page can
-- set it: there is no grant on the column.
alter table public.profiles
  add column if not exists hidden boolean not null default false;

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- The boards read through these, so hiding takes effect on both at once.
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
    sum(s.correct)::int as total,
    count(*)::int      as days,
    rank() over (
      order by sum(s.correct) desc, count(*) asc, min(s.created_at) asc
    ) as place
  from public.daily_scores s
  left join public.profiles p on p.id = s.user_id
  group by s.user_id, p.display_name, p.avatar_url, p.hidden;

grant select on public.daily_board, public.lifetime_board to anon, authenticated;


-- ---------------------------------------------------------------- using it --
--
-- Add a word:      insert into banned_words (word, whole_word) values ('...', false);
-- Let one through: insert into allowed_words (word) values ('...');
-- Hide a player:   update profiles set hidden = true where display_name = '...';
-- Try the test:    select public.name_is_banned('Sh1t Head');   -- true
--                  select public.name_is_banned('Scunthorpe');  -- false
