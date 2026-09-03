-- citylayoutguessr — keeping the board's names civil.
--
-- Four parts, in order of how much they can be trusted:
--
--   1. a normaliser, so "f4ck", "f.u.c.k", "𝐟𝐮𝐜𝐤" and "ｆｕｃｋ" are all read as
--      the word itself and the list does not have to enumerate every spelling;
--   2. a list you can edit, checked by a trigger on every insert and update,
--      so a name is refused at the database and not merely in the page;
--   3. a floor, so a name made entirely of emoji, symbols or a script the
--      normaliser cannot read is refused rather than waved through unread;
--   4. a switch you can flip on any row, because no list catches everything
--      and the fastest fix for a name someone worked hard on is your own hand.
--
-- Run this after schema.sql. Safe to run again, and safe to run whether or not
-- an earlier version of this file was ever applied.


-- ------------------------------------------------------- 1. normalising --
--
-- The job here is to collapse every way of writing a word down to one spelling,
-- so the list below only has to name the word once.
--
--   normalize(..., NFKD)  unwraps every compatibility form Unicode knows about
--                         in one step: fullwidth ｆｕｃｋ, the mathematical
--                         alphabets (𝐟𝐮𝐜𝐤 𝒇𝒖𝒄𝒌 𝔣𝔲𝔠𝔨 𝕗𝕦𝕔𝕜 𝗳𝘂𝗰𝗸 𝚏𝚞𝚌𝚔), circled
--                         ⓕⓤⓒⓚ, and accents, which fall apart into a plain
--                         letter followed by a combining mark.
--   the combining marks   then get dropped, which folds the accents and takes
--                         the teeth out of stacked "zalgo" text at the same
--                         time.
--   the invisibles        get dropped, so a zero-width space cannot be used to
--                         cut a word in half.
--   the lookalikes        Cyrillic а, Greek ο, small-capital ᴀ and friends are
--                         real letters of their own, so NFKD leaves them be.
--                         They are mapped by hand.
--   the leetspeak         digits and punctuation that stand in for letters.
--   everything else       is thrown away, and runs of spaces are squeezed.
--
-- "Nöah_D33" -> "noah dee".   "𝓕Ｕ¢Ⓚ" -> "fuck".

create or replace function public.name_key(txt text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(
    regexp_replace(
      translate(
        translate(
          regexp_replace(
            regexp_replace(
              lower(normalize(coalesce(txt, ''), NFKD)),
              -- combining marks: accents, and zalgo stacking. Written as
              -- escapes rather than as themselves, because a combining mark
              -- typed into a file attaches itself to the quote in front of it
              -- and the line stops being readable.
              E'[\u0300-\u036F\u0483-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20F0\uFE20-\uFE2F]',
              '', 'g'
            ),
            -- things that take up no space: soft hyphen, zero-width spaces and
            -- joiners, bidi overrides, the word joiner, the Hangul filler and
            -- the byte-order mark, any of which can hide a seam inside a word
            E'[\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\u3164\uFEFF\uFFA0]',
            '', 'g'
          ),
          -- Cyrillic and Greek letters that are drawn as Latin ones
          'авгеѕіїјкмнорстухьъԁԛѵѡӏαβγεικνορτυχηℓ',
          'abresiijkmhopctyxbbdqvwlabyeikvoptuxnl'
        ),
        -- small capitals and stray Latin letters NFKD leaves alone, then the
        -- leetspeak: digits and punctuation standing in for letters
        'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘʀᴛᴜᴠᴡʏᴢɑɡɛłøđħŧıǫ013456789@$!+|(<',
        'abcdefghijklmnoprtuvwyzagelodhtiqoieasgtbgasiticc'
      ),
      '[^a-z ]', '', 'g'
    ),
    ' +', ' ', 'g'
  ));
$$;

-- The same thing with the spaces taken out, which is what a word is looked for
-- inside: "f u c k" and "f.u.c.k" both arrive here as "fuck".
create or replace function public.name_squash(txt text)
returns text
language sql
immutable
as $$
  select replace(public.name_key(txt), ' ', '');
$$;

-- The name cut into words the way a person would read it, which is not the
-- same way name_key does. "BigCock69" has no spaces in it, but the capital and
-- the digits are seams all the same, and the words on the list that only count
-- on their own — cock, ass, sex — are exactly the ones that get hidden inside a
-- run-together name. So: a space at every lower-to-upper turn, a space for
-- every digit and every mark, and no leetspeak folding, because a digit here is
-- a gap rather than a letter.
--
-- "BigCock69" -> "big cock".   "Hancock" -> "hancock", untouched.
create or replace function public.name_words(txt text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(
    regexp_replace(
      translate(
        translate(
          lower(regexp_replace(
            regexp_replace(
              normalize(coalesce(txt, ''), NFKD),
              E'[\u0300-\u036F\u0483-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20F0\uFE20-\uFE2F\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\u3164\uFEFF\uFFA0]',
              '', 'g'
            ),
            -- the seam between a small letter and a capital
            '([[:lower:]])([[:upper:]])', '\1 \2', 'g'
          )),
          'авгеѕіїјкмнорстухьъԁԛѵѡӏαβγεικνορτυχηℓ',
          'abresiijkmhopctyxbbdqvwlabyeikvoptuxnl'
        ),
        'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘʀᴛᴜᴠᴡʏᴢɑɡɛłøđħŧıǫ',
        'abcdefghijklmnoprtuvwyzagelodhtiq'
      ),
      '[^a-z]', ' ', 'g'
    ),
    ' +', ' ', 'g'
  ));
$$;

-- Whether there is a letter or a digit in there anywhere — in any script, so
-- 中村, محمد and Владимир all count, and so does 305. This is how part 3 tells
-- a name apart from a row of emoji or box-drawing characters.
create or replace function public.name_is_readable(txt text)
returns boolean
language sql
immutable
as $$
  select coalesce(txt, '') ~ '[[:alnum:]]';
$$;


-- ------------------------------------------------------------ 2. the list --

-- whole_word = true   only counts as a match on its own, so Cassandra and
--                     Scunthorpe keep their names.
-- whole_word = false  counts anywhere in the name, for things that are never
--                     an innocent part of another word.
--
-- Every word is matched with its letters allowed to repeat — "fuck" is looked
-- for as f+u+c+k+ — so "fuuuuck" and "shiiiiit" need no lines of their own.
-- Words are plain lowercase letters only, which is what makes that safe; the
-- constraint below keeps it that way.

create table if not exists public.banned_words (
  word       text primary key,
  whole_word boolean not null default false,
  note       text
);

alter table public.banned_words drop constraint if exists banned_words_plain;
alter table public.banned_words
  add constraint banned_words_plain check (word ~ '^[a-z]{2,}$');

alter table public.banned_words enable row level security;
-- No policies and no grants: nothing that reaches a browser can read this list,
-- let alone add to it. You edit it in the dashboard.
revoke all on public.banned_words from anon, authenticated;

insert into public.banned_words (word, whole_word, note) values
  -- profanity
  ('fuck', false, null),
  ('fuk', false, null),
  ('fck', false, null),
  ('fuq', false, null),
  ('fack', false, null),
  ('phuck', false, null),
  ('shit', true, 'whole word: "shitake", place names'),
  ('shite', false, null),
  ('bullshit', false, null),
  ('cunt', false, null),
  ('bitch', false, null),
  ('bastard', false, null),
  ('wanker', false, null),
  ('wank', false, null),
  ('twat', false, null),
  ('prick', true, 'whole word: pricked, prickly'),
  ('arse', true, 'whole word: MARSEILLE, Larsen, Dakar Senegal'),
  ('arsehole', false, null),
  ('ass', true, 'whole word: cassandra, assam, embassy'),
  ('asshole', false, null),
  ('dumbass', false, null),
  ('jackass', false, null),
  ('turd', false, null),
  ('crap', true, 'whole word: scrape, scrap'),
  ('douche', false, null),
  ('bollock', false, null),
  ('bugger', false, null),

  -- anatomy and sex
  ('dick', true, 'whole word: it is also a name'),
  ('dickhead', false, null),
  ('dickface', false, null),
  ('cock', true, 'whole word: cockburn, cockerel'),
  ('penis', false, null),
  ('vagina', false, null),
  ('anus', true, null),
  ('anal', true, 'whole word: analysis, canal'),
  ('rectum', false, null),
  ('scrotum', false, null),
  ('nutsack', false, null),
  ('ballsack', false, null),
  ('chode', false, null),
  ('smegma', false, null),
  ('slut', false, null),
  ('whore', false, null),
  ('hoe', true, 'whole word: shoe, hoedown'),
  ('pussy', false, null),
  ('titties', false, null),
  ('tits', true, 'whole word: titmouse'),
  ('boner', false, null),
  ('porn', false, null),
  ('pornhub', false, null),
  ('hentai', false, null),
  ('dildo', false, null),
  ('jizz', false, null),
  ('cum', true, 'whole word: cumbria, circumference'),
  ('cumshot', false, null),
  ('blowjob', false, null),
  ('handjob', false, null),
  ('rimjob', false, null),
  ('felch', false, null),
  ('sex', true, 'whole word: sussex, essex, middlesex'),
  ('sexy', true, null),
  ('orgy', false, null),
  ('erection', false, null),
  ('masturbat', false, 'the root, so -e -ing -ion need no lines'),
  ('fisting', false, null),

  -- slurs
  ('nigg', false, 'the root, so the spellings do not each need a line'),
  ('nigr', false, null),
  ('negro', false, null),
  ('faggot', false, null),
  ('fagg', false, null),
  ('fag', true, 'whole word: fagin, fagot the musical term'),
  ('chink', true, 'whole word: chinkapin, "a chink of light"'),
  ('gook', true, 'whole word: gookin'),
  ('spic', true, 'whole word: spice, spicy, suspicious'),
  ('wetback', false, null),
  ('beaner', false, null),
  ('kike', true, null),
  ('coon', true, 'whole word: raccoon, cocoon, tycoon'),
  ('tranny', false, null),
  ('shemale', false, null),
  ('retard', false, null),
  ('spastic', false, null),
  ('mongoloid', false, null),
  ('cripple', true, 'whole word: crippling'),
  ('paki', true, 'whole word: pakistan itself is fine'),
  ('raghead', false, null),
  ('towelhead', false, null),
  ('gypo', false, null),
  ('injun', false, null),
  ('redskin', false, null),
  ('honky', false, null),
  ('cracker', true, 'whole word: firecracker, nutcracker'),

  -- hate and extremism
  ('nazi', false, null),
  ('hitler', false, null),
  ('heilhitler', false, null),
  ('sieghell', false, null),
  ('siegheil', false, null),
  ('holocaust', false, null),
  ('kkk', false, null),
  ('klansman', false, null),
  ('whitepower', false, null),
  ('whitepride', false, null),
  ('gaschamber', false, null),
  ('jihad', false, null),
  ('terrorist', false, null),

  -- harm
  ('rape', true, 'whole word: grape, drape, rapeseed'),
  ('rapist', false, null),
  ('molest', false, null),
  ('pedo', false, null),
  ('paedo', false, null),
  ('pedophile', false, null),
  ('killyourself', false, null),
  ('kys', true, null),
  ('suicide', false, null),
  ('lynching', false, null),

  -- not English. The normaliser folds these the same way, so they cost
  -- nothing to check, and the board is played in more than one language.
  ('puta', true, 'whole word: putamen, computable'),
  ('putamadre', false, null),
  ('puto', true, null),
  ('mierda', false, null),
  ('cabron', false, null),
  ('pendejo', false, null),
  ('gilipollas', false, null),
  ('chingar', false, null),
  ('chinga', false, null),
  ('verga', true, 'whole word: Vergara is a surname'),
  ('joder', true, null),
  ('merde', true, null),
  ('salope', false, null),
  ('connard', false, null),
  ('putain', false, null),
  ('scheisse', false, null),
  ('arschloch', false, null),
  ('fotze', false, null),
  ('wichser', false, null),
  ('kurwa', false, null),
  ('cazzo', false, null),
  ('stronzo', false, null),
  ('coglione', false, null),
  ('caralho', false, null),
  ('foda', true, 'whole word: fodase'),
  ('kanker', false, null),
  ('klootzak', false, null),

  -- claiming to be the house
  ('admin', true, 'not rude, but not yours to claim'),
  ('administrator', false, null),
  ('moderator', true, null),
  ('official', true, null),
  ('citylayoutguessr', true, null)
on conflict (word) do nothing;

-- Words that were on the list once and caught more real names than rude ones.
-- Named here so re-running the file takes them back out.
delete from public.banned_words
 where word in ('semen', 'isis', 'lynch', 'noahlee');

-- Innocent words that would otherwise trip a substring rule. Checked first,
-- against the whole name with its spaces removed.
create table if not exists public.allowed_words (
  word text primary key
);

alter table public.allowed_words enable row level security;
revoke all on public.allowed_words from anon, authenticated;

insert into public.allowed_words (word) values
  ('scunthorpe'), ('penistone'), ('lightwater'), ('assange'), ('cassandra'),
  ('classic'), ('grape'), ('therapist'), ('cockburn'), ('hancock'),
  ('sussex'), ('essex'), ('middlesex'), ('cumbria'), ('cumberland'),
  ('analysis'), ('canal'), ('shiitake'), ('raccoon'), ('cocoon'),
  ('tycoon'), ('spice'), ('spicy'), ('shoe'), ('bangkok'), ('phuket'),
  ('titicaca'), ('dickens'), ('dickinson'), ('nigeria'), ('niger'),
  ('nigerian'), ('scrape'), ('circumference'), ('kissimmee'), ('sexton')
on conflict (word) do nothing;


-- Returns true if a name should be refused because of the list.
create or replace function public.name_is_banned(txt text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  nkey     text := public.name_key(txt);
  squashed text := public.name_squash(txt);
  -- the same name cut at its capitals and digits, for the words that only
  -- count on their own
  nwords   text := public.name_words(txt);
  -- "ph" written for "f", checked as a second spelling of the same name
  variant  text := replace(squashed, 'ph', 'f');
  w        record;
  pattern  text;
  innocent record;
begin
  if squashed = '' then
    return false;   -- part 3 deals with this case
  end if;

  -- A name that is entirely an innocent word is let through whatever it
  -- happens to contain.
  if exists (select 1 from public.allowed_words aw where aw.word = squashed) then
    return false;
  end if;

  -- And an innocent word sitting inside a longer name is taken out of the way
  -- before anything is looked for: "ScunthorpeUnited" is united, "TherapistTom"
  -- is Tom. Longest first, so "penistone" goes before anything shorter that
  -- overlaps it, and a space is left behind rather than a join, so removing a
  -- word can never splice two halves into a new one.
  for innocent in
    select word from public.allowed_words order by length(word) desc
  loop
    squashed := replace(squashed, innocent.word, ' ');
    variant  := replace(variant,  innocent.word, ' ');
  end loop;

  for w in select word, whole_word from public.banned_words loop
    -- f u c k  ->  f+u+c+k+, so any letter may be held down
    pattern := regexp_replace(w.word, '(.)', '\1+', 'g');

    if w.whole_word then
      if nkey ~ ('(^| )' || pattern || '( |$)')
         or nwords ~ ('(^| )' || pattern || '( |$)') then
        return true;
      end if;
    else
      if squashed ~ pattern or variant ~ pattern then
        return true;
      end if;
    end if;
  end loop;

  return false;
end;
$$;

revoke all on function public.name_is_banned(text) from anon, authenticated;
revoke all on function public.name_key(text)     from anon, authenticated;
revoke all on function public.name_squash(text)  from anon, authenticated;
revoke all on function public.name_is_readable(text) from anon, authenticated;
drop function if exists public.name_letters(text);
drop function if exists public.name_has_a_letter(text);


-- --------------------------------------------------------------- 3. floor --
--
-- A name has to contain a letter or a number. Not a Latin one — any script, so
-- 中村, محمد, Владимир and 305 are all fine. What this refuses is a name with
-- no readable character in it at all: "🌍🌎🌏", "████", "!!!". Those say nothing
-- the list could read, and a board is easier to read when the rows are names.
--
-- If you would rather allow anything that is merely unreadable, drop the
-- second branch of the trigger below — the floor is the only thing that
-- depends on it.

-- The one function the trigger calls, so there is a single answer to look at:
-- null when the name is fine, otherwise the reason to give back.
create or replace function public.name_refusal(txt text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if txt is null then
    return null;
  end if;
  if public.name_is_banned(txt) then
    return 'that name is not allowed';
  end if;
  if not public.name_is_readable(txt) then
    return 'that name is not allowed — it needs a letter or a number in it';
  end if;
  return null;
end;
$$;

revoke all on function public.name_refusal(text) from anon, authenticated;


-- The trigger. On a rename it refuses, so the page can say so; on the row
-- created at sign-up it quietly substitutes, because nobody should be locked
-- out of signing in over the name their Google account happens to carry.
create or replace function public.check_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  refusal text;
begin
  if new.display_name is null then
    return new;
  end if;

  new.display_name := btrim(new.display_name);
  if new.display_name = '' then
    new.display_name := 'player';
    return new;
  end if;

  refusal := public.name_refusal(new.display_name);
  if refusal is not null then
    if tg_op = 'INSERT' then
      new.display_name := 'player';
    else
      raise exception '%', refusal using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_name_check on public.profiles;
create trigger profiles_name_check
  before insert or update of display_name on public.profiles
  for each row execute function public.check_display_name();


-- The shape of a name, independent of what it says. Kept in step with the
-- normaliser above: the same invisible characters that could hide a seam
-- inside a word are refused outright, and so is a wall of combining marks.
-- 60 rather than 24: the name Google supplies on sign-up has to fit too, or
-- the sign-up trigger would fail and nobody could sign in. The rename box in
-- the page asks for 24.
alter table public.profiles drop constraint if exists profiles_name_sane;
alter table public.profiles
  add constraint profiles_name_sane
  check (
    display_name is null
    or (char_length(display_name) between 1 and 60
        and display_name !~ E'[\u0001-\u001F\u007F-\u009F\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2028\u2029\u2060-\u2064\u206A-\u206F\u3164\uFEFF\uFFF9-\uFFFB\uFFA0]'
        -- no more than four accents in a row: enough for any real language,
        -- not enough to draw with
        and display_name !~ E'[\u0300-\u036F\u0483-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20F0\uFE20-\uFE2F]{5}')
  )
  not valid;


-- ------------------------------------------------------- 4. your own hand --

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


-- ------------------------------------------------- sweeping up what is there --
--
-- The trigger only sees names written from now on. Anything already on the
-- board was written before it, so it is checked once, here. Names that would
-- be refused today are hidden rather than rewritten, so you can see what they
-- were in the table and decide for yourself.

update public.profiles
   set hidden = true
 where hidden = false
   and display_name is not null
   and public.name_refusal(display_name) is not null;


-- ---------------------------------------------------------------- using it --
--
-- Add a word:      insert into banned_words (word, whole_word) values ('...', false);
-- Let one through: insert into allowed_words (word) values ('...');
-- Hide a player:   update profiles set hidden = true where display_name = '...';
-- Unhide one:      update profiles set hidden = false where id = '...';
-- See who is hidden:
--                  select id, display_name from profiles where hidden;
--
-- Try it:          select public.name_refusal('Sh1t Head');    -- refused
--                  select public.name_refusal('ｆｕｃｋ');        -- refused
--                  select public.name_refusal('𝐟𝐮𝐜𝐤');         -- refused
--                  select public.name_refusal('fuuuuck');      -- refused
--                  select public.name_refusal('f.u.c.k');      -- refused
--                  select public.name_refusal('🌍🌎🌏');         -- refused
--                  select public.name_refusal('Scunthorpe');   -- null, fine
--                  select public.name_refusal('Cassandra');    -- null, fine
--                  select public.name_refusal('Noah 🌍');       -- null, fine
