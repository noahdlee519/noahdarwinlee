-- CHRONIA's replies, upvotes, and the account's own comments (25 November 2026), on top of
-- 202611240700_chronia_comments.sql; the design is docs/superpowers/specs/2026-11-25-chronia-replies-votes-design.md.
--
-- A comment either starts a thread (parent_id null, depth 0) or replies to another (its parent), down to depth 8; a
-- reply keeps its thread's top comment in root_id and its thread's name in polity. A reply to a comment at depth 8 is
-- stored beside it, as a reply to its parent, with reply_to naming the comment it answers, so "Replying to @name"
-- can be said. An upvote is a row of chronia_votes, one for each account and comment, and the comment's count of
-- them is kept in votes.
--
-- A comment's place in a thread outlives its text. Whichever way its writer goes (deleting it, the team's Erase, or the
-- sign-in account deleted in Supabase, which cascades through chronia_profiles), the comment's account becomes null:
-- the key to chronia_profiles is now `on delete set null`, and deleting one's own comment sets it null too. A trigger
-- on that change turns the row into a placeholder (deleted, no text, no reports, no upvotes), and, once the statement
-- is done, erases it if nothing replies to it; erasing a reply erases a placeholder it leaves with no replies, up the
-- thread. So others' replies keep their thread, and no row holds an erased account's words. A BEFORE DELETE trigger
-- could not do this: a row a foreign key's cascade deletes can't be kept.
--
-- As before, the tables are closed to the page (row-level security on, no policies, no grants to anon or
-- authenticated), the functions run as their caller (service_role) and decide the caps under a lock on the account,
-- and the triggers' functions are security definer, so that a cascade from Supabase's own role can run them. Safe to
-- run twice: columns, tables, and indexes are added only if missing, constraints are made again only if they differ,
-- and functions are replaced.

-- ---------------------------------------------------------------- the columns

alter table public.chronia_comments add column if not exists parent_id bigint;
alter table public.chronia_comments add column if not exists root_id bigint;
alter table public.chronia_comments add column if not exists reply_to bigint;
alter table public.chronia_comments add column if not exists depth smallint not null default 0;
alter table public.chronia_comments add column if not exists votes integer not null default 0;
alter table public.chronia_comments add column if not exists deleted boolean not null default false;
-- Upvotes given today (UTC), for the day's cap; a vote and its taking back count as one each.
alter table public.chronia_profiles add column if not exists vote_day date;
alter table public.chronia_profiles add column if not exists vote_count integer not null default 0;

alter table public.chronia_comments alter column user_id drop not null;

do $$
begin
  -- The writer's key: set null when the profile goes, so the trigger below can keep a placeholder.
  if not exists (select 1 from pg_constraint where conname = 'chronia_comments_user_id_fkey' and confdeltype = 'n') then
    alter table public.chronia_comments drop constraint if exists chronia_comments_user_id_fkey;
    alter table public.chronia_comments add constraint chronia_comments_user_id_fkey
      foreign key (user_id) references public.chronia_profiles (user_id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chronia_comments_parent_id_fkey') then
    alter table public.chronia_comments add constraint chronia_comments_parent_id_fkey
      foreign key (parent_id) references public.chronia_comments (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chronia_comments_reply_to_fkey') then
    alter table public.chronia_comments add constraint chronia_comments_reply_to_fkey
      foreign key (reply_to) references public.chronia_comments (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chronia_comments_depth_check') then
    alter table public.chronia_comments add constraint chronia_comments_depth_check check (depth between 0 and 8);
  end if;
  -- A top comment has neither parent nor root; a reply has both.
  if not exists (select 1 from pg_constraint where conname = 'chronia_comments_tree_check') then
    alter table public.chronia_comments add constraint chronia_comments_tree_check
      check ((depth = 0 and root_id is null) or (depth > 0 and root_id is not null));
  end if;
  -- Only a placeholder is without an account, and only a placeholder is without text.
  if not exists (select 1 from pg_constraint where conname = 'chronia_comments_writer_check') then
    alter table public.chronia_comments add constraint chronia_comments_writer_check check (user_id is not null or deleted);
  end if;
  alter table public.chronia_comments drop constraint if exists chronia_comments_body_check;
  if not exists (select 1 from pg_constraint where conname = 'chronia_comments_body_shape') then
    alter table public.chronia_comments add constraint chronia_comments_body_shape
      check ((deleted and body = '') or (not deleted and char_length(body) between 1 and 500));
  end if;
end $$;

create index if not exists chronia_comments_root on public.chronia_comments (root_id, sent_at) where root_id is not null;
create index if not exists chronia_comments_parent on public.chronia_comments (parent_id) where parent_id is not null;
create index if not exists chronia_comments_reply_to on public.chronia_comments (reply_to) where reply_to is not null;
create index if not exists chronia_comments_tops on public.chronia_comments (polity, sent_at desc) where parent_id is null;

create table if not exists public.chronia_votes (
  user_id uuid not null references public.chronia_profiles (user_id) on delete cascade,
  comment_id bigint not null references public.chronia_comments (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
create index if not exists chronia_votes_comment on public.chronia_votes (comment_id);

alter table public.chronia_votes enable row level security;
revoke all on public.chronia_votes from public, anon, authenticated;
grant select, insert, update, delete on public.chronia_votes to service_role;

-- ---------------------------------------------------------------- the triggers

-- A comment's count of upvotes follows its rows in chronia_votes, however they come and go (a vote, its taking back,
-- or the voter's profile erased). Counted again rather than stepped, so the count can't drift.
create or replace function public.chronia_votes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c bigint := case when tg_op = 'DELETE' then old.comment_id else new.comment_id end;
begin
  update public.chronia_comments set votes = (select count(*) from public.chronia_votes v where v.comment_id = c)
  where id = c and votes is distinct from (select count(*) from public.chronia_votes v where v.comment_id = c);
  return null;
end;
$$;
drop trigger if exists chronia_votes_count on public.chronia_votes;
create trigger chronia_votes_count after insert or delete on public.chronia_votes
  for each row execute function public.chronia_votes_count();

-- A comment whose account becomes null (deleted by its writer, or the writer's profile erased) becomes a placeholder:
-- no text, live, no reports. Its votes and reports are erased after the statement, by chronia_comments_left.
create or replace function public.chronia_comments_orphan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.deleted := true;
  new.body := '';
  new.state := 'live';
  new.flags := 0;
  return new;
end;
$$;
drop trigger if exists chronia_comments_orphan on public.chronia_comments;
create trigger chronia_comments_orphan before update of user_id on public.chronia_comments
  for each row when (old.user_id is not null and new.user_id is null)
  execute function public.chronia_comments_orphan();

-- After the statement that made it, a placeholder loses its votes and reports, and is erased if nothing replies to it.
-- (Its erasing then runs chronia_comments_gone, for its own parent.)
create or replace function public.chronia_comments_left()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.chronia_votes where comment_id = new.id;
  delete from public.chronia_flags where comment_id = new.id;
  delete from public.chronia_comments c
  where c.id = new.id and c.deleted
    and not exists (select 1 from public.chronia_comments r where r.parent_id = c.id);
  return null;
end;
$$;
drop trigger if exists chronia_comments_left on public.chronia_comments;
create trigger chronia_comments_left after update of user_id on public.chronia_comments
  for each row when (old.user_id is not null and new.user_id is null)
  execute function public.chronia_comments_left();

-- An erased comment's parent, if it is a placeholder left with no replies, is erased too (and so on up the thread).
create or replace function public.chronia_comments_gone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.parent_id is not null then
    delete from public.chronia_comments c
    where c.id = old.parent_id and c.deleted
      and not exists (select 1 from public.chronia_comments r where r.parent_id = c.id);
  end if;
  return null;
end;
$$;
drop trigger if exists chronia_comments_gone on public.chronia_comments;
create trigger chronia_comments_gone after delete on public.chronia_comments
  for each row execute function public.chronia_comments_gone();

-- ---------------------------------------------------------------- comments as the page sees them

-- Whether a comment is shown as itself: live, not deleted, by an account not blocked.
create or replace function public.chronia_comment_shown(p_comment bigint)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select c.state = 'live' and not c.deleted and not p.blocked
                   from public.chronia_comments c join public.chronia_profiles p on p.user_id = c.user_id
                   where c.id = p_comment), false);
$$;

-- One comment as the page sees it, for p_viewer (null signed out). A comment not shown as itself is a placeholder:
-- no name, picture, text, or upvotes, with deleted true, and hidden true if it was hidden, removed, or blocked rather
-- than deleted. replying_to is the username of the comment answered where that is not the parent (a reply to a
-- comment at depth 8), or, with p_any, of the comment answered whatever it is; null if that comment is not shown.
-- p_team adds the team's fields to a comment shown.
create or replace function public.chronia_comment_view(p_comment bigint, p_viewer uuid, p_team boolean default false,
                                                       p_any boolean default false)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when c.state = 'live' and not c.deleted and p.user_id is not null and not p.blocked then
      jsonb_build_object('id', c.id, 'username', p.username,
        'avatar', case when p.avatar_state = 'ok' and not p.avatar_kept then p.avatar end,
        'polity', c.polity, 'at', c.at, 'text', c.body,
        'mine', p_viewer is not null and c.user_id = p_viewer,
        'parent', c.parent_id, 'root', c.root_id, 'depth', c.depth, 'votes', c.votes,
        'voted', p_viewer is not null and exists (select 1 from public.chronia_votes v where v.comment_id = c.id and v.user_id = p_viewer),
        'replying_to', (select rp.username from public.chronia_comments r join public.chronia_profiles rp on rp.user_id = r.user_id
                        where r.id = case when p_any then coalesce(c.reply_to, c.parent_id) else c.reply_to end
                          and r.state = 'live' and not r.deleted and not rp.blocked))
      || case when p_team then jsonb_build_object('flags', c.flags, 'state', c.state, 'user', c.user_id) else '{}'::jsonb end
    else
      jsonb_build_object('id', c.id, 'username', null, 'avatar', null, 'polity', c.polity, 'at', c.at, 'text', '',
        'mine', false, 'parent', c.parent_id, 'root', c.root_id, 'depth', c.depth, 'votes', 0, 'voted', false,
        'replying_to', null, 'deleted', true)
      || case when c.deleted then '{}'::jsonb else '{"hidden": true}'::jsonb end
    end
  from public.chronia_comments c left join public.chronia_profiles p on p.user_id = c.user_id
  where c.id = p_comment;
$$;

-- One comment as the team sees it: for restore, remove, and the queue; a reply with its parent and its thread's top.
create or replace function public.chronia_comment_row(p_comment bigint)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('id', c.id, 'username', p.username, 'avatar', p.avatar, 'polity', c.polity, 'at', c.at,
                            'text', c.body, 'flags', c.flags, 'state', c.state, 'user', c.user_id, 'sent', c.sent_at,
                            'blocked', p.blocked, 'avatar_kept', p.avatar_kept, 'parent', c.parent_id, 'root', c.root_id)
  from public.chronia_comments c join public.chronia_profiles p on p.user_id = c.user_id
  where c.id = p_comment;
$$;

-- A card's list: the top comments under any of p_names, each shown as itself, or as a placeholder while live replies
-- are under it (so they can still be reached), with `replies`, the count of live replies under it at any depth.
-- p_sort 'near' orders by distance from p_at_num, then newest; 'top' by upvotes, then newest; anything else, newest
-- first. p_team adds the team's fields (flags, state, and the writer's account id).
create or replace function public.chronia_thread(p_names text[], p_sort text, p_at_num numeric, p_offset integer,
                                                 p_limit integer, p_viewer uuid, p_team boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_near boolean := p_sort = 'near' and p_at_num is not null;
  v_top boolean := p_sort = 'top';
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_total integer;
  v_rows jsonb;
begin
  with tops as (
    select t.id, t.at_num, t.votes, t.sent_at, t.replies
    from (
      select c.id, c.at_num, case when s.shown then c.votes else 0 end as votes, c.sent_at, s.shown,
             (select count(*) from public.chronia_comments r join public.chronia_profiles rp on rp.user_id = r.user_id
              where r.root_id = c.id and r.state = 'live' and not r.deleted and not rp.blocked)::integer as replies
      from public.chronia_comments c
      left join public.chronia_profiles p on p.user_id = c.user_id
      cross join lateral (select c.state = 'live' and not c.deleted and p.user_id is not null and not p.blocked as shown) s
      where c.parent_id is null and c.polity = any(p_names)
    ) t
    where t.shown or t.replies > 0
  ),
  ordered as (
    select t.*, count(*) over () as n,
           row_number() over (order by case when v_near then abs(t.at_num - p_at_num) end,
                                       case when v_top then t.votes end desc nulls last,
                                       t.sent_at desc, t.id desc) as o
    from tops t
  )
  select coalesce(max(n), 0)::integer,
         coalesce(jsonb_agg(public.chronia_comment_view(id, p_viewer, p_team) || jsonb_build_object('replies', replies) order by o)
                  filter (where o > v_offset and o <= v_offset + v_limit), '[]'::jsonb)
  into v_total, v_rows
  from ordered;

  return jsonb_build_object('comments', v_rows, 'more', v_offset + jsonb_array_length(v_rows) < v_total, 'total', v_total);
end;
$$;

-- A whole thread: the top comment of p_comment (itself, if it is one) and every reply under it, in order of sending,
-- at most p_limit. A comment not shown as itself appears as a placeholder only if a comment shown is under it.
-- 'missing' if there is no such comment, or nothing of its thread is shown.
create or replace function public.chronia_thread_of(p_comment bigint, p_viewer uuid, p_limit integer)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_root bigint;
  v_limit integer := least(greatest(coalesce(p_limit, 400), 1), 1000);
  v_ids bigint[];
  v_total integer;
begin
  select coalesce(root_id, id) into v_root from public.chronia_comments where id = p_comment;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  with recursive tree as (
    select c.id, c.sent_at, array[c.id] as path from public.chronia_comments c where c.id = v_root
    union all
    select c.id, c.sent_at, t.path || c.id from public.chronia_comments c join tree t on c.parent_id = t.id
    where c.root_id = v_root
  ),
  marked as (select t.*, public.chronia_comment_shown(t.id) as shown from tree t),
  kept as (
    select m.id, m.sent_at from marked m
    where m.shown or exists (select 1 from marked d where d.shown and m.id = any(d.path) and d.id <> m.id)
  )
  select array_agg(id order by sent_at, id), count(*) into v_ids, v_total from kept;
  if coalesce(v_total, 0) = 0 then
    return jsonb_build_object('error', 'missing');
  end if;
  return jsonb_build_object(
    'comments', (select coalesce(jsonb_agg(public.chronia_comment_view(i, p_viewer) order by o), '[]'::jsonb)
                 from unnest(v_ids[1:v_limit]) with ordinality u(i, o)),
    'more', v_total > v_limit,
    'root', v_root);
end;
$$;

-- The account's own comments and replies, newest first: each with its name, its map date, its text (even while hidden
-- or removed, with its state, so the writer knows), its upvotes, and, for a reply, the username of the comment it
-- answers (null if that is not shown).
create or replace function public.chronia_mine(p_user uuid, p_offset integer, p_limit integer)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_rows jsonb;
  v_total integer;
begin
  select count(*) into v_total from public.chronia_comments where user_id = p_user;
  select coalesce(jsonb_agg(x.j order by x.sent_at desc, x.id desc), '[]'::jsonb) into v_rows
  from (
    select c.id, c.sent_at,
           jsonb_build_object('id', c.id, 'username', p.username,
             'avatar', case when p.avatar_state = 'ok' and not p.avatar_kept then p.avatar end,
             'polity', c.polity, 'at', c.at, 'text', c.body, 'mine', true, 'state', c.state,
             'parent', c.parent_id, 'root', c.root_id, 'depth', c.depth, 'votes', c.votes, 'voted', false,
             'replying_to', (select rp.username from public.chronia_comments r join public.chronia_profiles rp on rp.user_id = r.user_id
                             where r.id = coalesce(c.reply_to, c.parent_id) and r.state = 'live' and not r.deleted and not rp.blocked)) as j
    from public.chronia_comments c join public.chronia_profiles p on p.user_id = c.user_id
    where c.user_id = p_user
    order by c.sent_at desc, c.id desc
    offset v_offset limit v_limit
  ) x;
  return jsonb_build_object('comments', v_rows, 'more', v_offset + jsonb_array_length(v_rows) < v_total);
end;
$$;

-- ---------------------------------------------------------------- posting, voting, and deleting

-- Posts a comment, or with p_parent a reply, holding the account's row meanwhile so two posts at once can't both pass
-- the day's cap (shared by comments and replies) or the gap between comments. Removed and hidden comments count toward
-- the cap; deleted ones can't. A reply goes under its parent's name (p_polity must be it: 'field' if not), at its
-- parent's depth + 1, or, under a comment at depth 8, beside it with reply_to set; its parent must be shown ('gone').
drop function if exists public.chronia_comment_send(uuid, text, text, numeric, text, integer, integer);
create or replace function public.chronia_comment_send(p_user uuid, p_polity text, p_at text, p_at_num numeric,
                                                       p_body text, p_cap integer, p_gap_s integer,
                                                       p_parent bigint default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_blocked boolean;
  since timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  n integer;
  v_last timestamptz;
  v_id bigint;
  v_sent timestamptz;
  par public.chronia_comments;
  v_parent bigint;
  v_root bigint;
  v_depth smallint := 0;
  v_reply_to bigint;
  v_to text;
begin
  select blocked into v_blocked from public.chronia_profiles where user_id = p_user for update;
  if not found then
    return jsonb_build_object('error', 'profile');
  end if;
  if v_blocked then
    return jsonb_build_object('error', 'blocked');
  end if;
  if p_parent is not null then
    select * into par from public.chronia_comments where id = p_parent for share;
    if not found or not public.chronia_comment_shown(p_parent) then
      return jsonb_build_object('error', 'gone');
    end if;
    if par.polity <> p_polity then
      return jsonb_build_object('error', 'field');
    end if;
    v_root := coalesce(par.root_id, par.id);
    if par.depth >= 8 then
      v_parent := par.parent_id;
      v_depth := 8;
      v_reply_to := par.id;
    else
      v_parent := par.id;
      v_depth := par.depth + 1;
    end if;
    select username into v_to from public.chronia_profiles where user_id = par.user_id;
  end if;
  select count(*) into n from public.chronia_comments where user_id = p_user and sent_at >= since;
  if n >= p_cap then
    return jsonb_build_object('error', 'limit');
  end if;
  select max(sent_at) into v_last from public.chronia_comments where user_id = p_user;
  if v_last > now() - make_interval(secs => p_gap_s) then
    return jsonb_build_object('error', 'fast',
      'wait', greatest(1, ceil(p_gap_s - extract(epoch from now() - v_last)))::integer);
  end if;
  insert into public.chronia_comments (user_id, polity, at, at_num, body, parent_id, root_id, reply_to, depth)
  values (p_user, p_polity, p_at, p_at_num, p_body, v_parent, v_root, v_reply_to, v_depth)
  returning id, sent_at into v_id, v_sent;
  return jsonb_build_object('id', v_id, 'sent', v_sent, 'left', p_cap - n - 1, 'parent', v_parent, 'root', v_root,
                            'depth', v_depth, 'replying_to', case when v_reply_to is not null then v_to end);
end;
$$;

-- An upvote given (p_on) or taken back, once for each account and comment, under a lock on the account. Giving one
-- already given, or taking back one not given, changes and counts nothing. p_cap a day (UTC), each change counted.
-- Not one's own comment ('own'), and only a comment shown ('gone').
create or replace function public.chronia_vote(p_user uuid, p_comment bigint, p_on boolean, p_cap integer)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  p public.chronia_profiles;
  d date := (now() at time zone 'utc')::date;
  v_owner uuid;
  v_had boolean;
  n integer;
begin
  select * into p from public.chronia_profiles where user_id = p_user for update;
  if not found then
    return jsonb_build_object('error', 'profile');
  end if;
  if p.blocked then
    return jsonb_build_object('error', 'blocked');
  end if;
  select user_id into v_owner from public.chronia_comments where id = p_comment for share;
  if not found or not public.chronia_comment_shown(p_comment) then
    return jsonb_build_object('error', 'gone');
  end if;
  if v_owner = p_user then
    return jsonb_build_object('error', 'own');
  end if;
  v_had := exists (select 1 from public.chronia_votes where user_id = p_user and comment_id = p_comment);
  if v_had <> p_on then
    n := case when p.vote_day = d then p.vote_count else 0 end;
    if n >= p_cap then
      return jsonb_build_object('error', 'limit');
    end if;
    update public.chronia_profiles set vote_count = n + 1, vote_day = d where user_id = p_user;
    if p_on then
      insert into public.chronia_votes (user_id, comment_id) values (p_user, p_comment);
    else
      delete from public.chronia_votes where user_id = p_user and comment_id = p_comment;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'votes', (select votes from public.chronia_comments where id = p_comment), 'voted', p_on);
end;
$$;

-- A writer deletes their own comment: its account is set null, and the triggers above erase it, or, if anything replies
-- to it, leave a placeholder. soft says which.
create or replace function public.chronia_comment_delete(p_user uuid, p_comment bigint)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  update public.chronia_comments set user_id = null where id = p_comment and user_id = p_user;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  return jsonb_build_object('ok', true, 'soft', exists (select 1 from public.chronia_comments where id = p_comment));
end;
$$;

-- The team's list, as before, with each reply's parent and top (chronia_comment_row); a placeholder has nothing to
-- review and is left out.
create or replace function public.chronia_queue()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'comments', coalesce((
      select jsonb_agg(public.chronia_comment_row(q.id) order by q.sent_at desc, q.id desc)
      from (select id, sent_at from public.chronia_comments where (flags > 0 or state <> 'live') and user_id is not null
            order by sent_at desc, id desc limit 500) q), '[]'::jsonb),
    'pictures', coalesce((
      select jsonb_agg(jsonb_build_object('username', username, 'avatar', coalesce(avatar, avatar_removed), 'kept', avatar_kept, 'user', user_id,
                                          'flags', avatar_flags, 'state', avatar_state) order by username_key)
      from public.chronia_profiles where avatar_flags > 0 or avatar_state <> 'ok'), '[]'::jsonb),
    'blocked', coalesce((
      select jsonb_agg(jsonb_build_object('username', username, 'avatar', avatar, 'user', user_id) order by username_key)
      from public.chronia_profiles where blocked), '[]'::jsonb),
    'names', coalesce((
      select jsonb_agg(polity order by polity) from (select distinct polity from public.chronia_comments) d), '[]'::jsonb));
$$;

-- Erases an account's profile, its comments (those with replies left as placeholders, by the triggers above), its
-- reports and upvotes, and the reports of its comments, for an account deleted on request or found to be under age,
-- and recounts what it had reported. The sign-in account is left alone. Returns the picture's file name, and that of
-- a removed one kept aside, for the caller to delete. Erasing an account with no profile is harmless.
create or replace function public.chronia_account_erase(p_user uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_avatar text;
  v_kept text;
  v_comments bigint[];
  v_pictures uuid[];
begin
  select avatar, avatar_removed into v_avatar, v_kept from public.chronia_profiles where user_id = p_user for update;
  if not found then
    return jsonb_build_object('ok', true, 'avatar', null, 'removed_avatar', null);
  end if;
  select array_agg(comment_id) filter (where comment_id is not null), array_agg(target_user) filter (where target_user is not null)
  into v_comments, v_pictures
  from public.chronia_flags where user_id = p_user;
  delete from public.chronia_profiles where user_id = p_user;
  update public.chronia_comments c set flags = (select count(*) from public.chronia_flags f where f.comment_id = c.id)
  where c.id = any(v_comments);
  update public.chronia_profiles p set avatar_flags = (select count(*) from public.chronia_flags f where f.target_user = p.user_id)
  where p.user_id = any(v_pictures);
  return jsonb_build_object('ok', true, 'avatar', v_avatar, 'removed_avatar', v_kept);
end;
$$;

do $$
declare
  f regprocedure;
begin
  foreach f in array array[
    'public.chronia_votes_count()',
    'public.chronia_comments_orphan()',
    'public.chronia_comments_left()',
    'public.chronia_comments_gone()',
    'public.chronia_comment_shown(bigint)',
    'public.chronia_comment_view(bigint, uuid, boolean, boolean)',
    'public.chronia_comment_row(bigint)',
    'public.chronia_thread(text[], text, numeric, integer, integer, uuid, boolean)',
    'public.chronia_thread_of(bigint, uuid, integer)',
    'public.chronia_mine(uuid, integer, integer)',
    'public.chronia_comment_send(uuid, text, text, numeric, text, integer, integer, bigint)',
    'public.chronia_vote(uuid, bigint, boolean, integer)',
    'public.chronia_comment_delete(uuid, bigint)',
    'public.chronia_queue()',
    'public.chronia_account_erase(uuid)']::regprocedure[] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
