-- CHRONIA's comments on the country card (24 November 2026): a profile for each account that comments (a
-- username, a picture, and when its writer ticked the age box), the comments themselves, stamped with the map's
-- date, and the reports of a comment or a picture.
--
-- The page never reads or writes these tables, or the picture bucket, itself. The edge function chronia-comments
-- does, with the project's secret key, after checking the Google session, the username and word filters, and the
-- picture check; the tables are closed to anon and authenticated (row-level security on, no policies, no grants)
-- so that nothing the page holds can get round those checks. The daily caps, the 10 seconds between comments,
-- and the hiding at three reports are decided here, under a lock on the account, so a burst sent at once can't
-- pass them. The functions run as their caller (service_role), not as their owner. Safe to run twice: tables
-- and indexes are made only if missing, functions are replaced, and the bucket is added only if absent.

create table if not exists public.chronia_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z][A-Za-z0-9_]{2,19}$'),
  username_key text not null unique check (username_key = lower(username_key) and char_length(username_key) between 1 and 40),
  avatar text check (char_length(avatar) between 1 and 200),
  avatar_state text not null default 'ok' check (avatar_state in ('ok', 'hidden', 'removed')),
  avatar_flags integer not null default 0,
  avatar_changes integer not null default 0,
  avatar_day date,
  age_ok_at timestamptz not null,
  named_at timestamptz not null default now(),
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists chronia_profiles_queue on public.chronia_profiles (user_id)
  where avatar_flags > 0 or avatar_state <> 'ok' or blocked;

create table if not exists public.chronia_comments (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.chronia_profiles (user_id) on delete cascade,
  polity text not null check (char_length(polity) between 1 and 200),
  at text not null check (char_length(at) between 1 and 20),
  at_num numeric not null,
  body text not null check (char_length(body) between 1 and 500),
  state text not null default 'live' check (state in ('live', 'hidden', 'removed')),
  flags integer not null default 0,
  sent_at timestamptz not null default now()
);
create index if not exists chronia_comments_thread on public.chronia_comments (polity, sent_at desc) where state = 'live';
create index if not exists chronia_comments_user on public.chronia_comments (user_id, sent_at desc);
create index if not exists chronia_comments_queue on public.chronia_comments (sent_at desc) where flags > 0 or state <> 'live';

create table if not exists public.chronia_flags (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.chronia_profiles (user_id) on delete cascade,
  comment_id bigint references public.chronia_comments (id) on delete cascade,
  target_user uuid references public.chronia_profiles (user_id) on delete cascade,
  sent_at timestamptz not null default now(),
  check ((comment_id is null) <> (target_user is null))
);
create unique index if not exists chronia_flags_once_comment on public.chronia_flags (user_id, comment_id) where comment_id is not null;
create unique index if not exists chronia_flags_once_picture on public.chronia_flags (user_id, target_user) where target_user is not null;
create index if not exists chronia_flags_comment on public.chronia_flags (comment_id) where comment_id is not null;
create index if not exists chronia_flags_picture on public.chronia_flags (target_user) where target_user is not null;
create index if not exists chronia_flags_user on public.chronia_flags (user_id, sent_at desc);

alter table public.chronia_profiles enable row level security;
alter table public.chronia_comments enable row level security;
alter table public.chronia_flags enable row level security;
revoke all on public.chronia_profiles, public.chronia_comments, public.chronia_flags from public, anon, authenticated;
revoke all on sequence public.chronia_comments_id_seq, public.chronia_flags_id_seq from public, anon, authenticated;
grant select, insert, update, delete on public.chronia_profiles, public.chronia_comments, public.chronia_flags to service_role;
grant usage, select on sequence public.chronia_comments_id_seq, public.chronia_flags_id_seq to service_role;

-- The pictures: public to read, written only by the function with the secret key (no storage policies).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chronia-avatars', 'chronia-avatars', true, 204800, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- One comment as the team sees it: for restore, remove, and the queue.
create or replace function public.chronia_comment_row(p_comment bigint)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('id', c.id, 'username', p.username, 'avatar', p.avatar, 'polity', c.polity, 'at', c.at,
                            'text', c.body, 'flags', c.flags, 'state', c.state, 'user', c.user_id, 'sent', c.sent_at,
                            'blocked', p.blocked)
  from public.chronia_comments c join public.chronia_profiles p on p.user_id = c.user_id
  where c.id = p_comment;
$$;

-- Makes a profile, or changes an existing one's username or picture. p_avatar null leaves the picture as it is,
-- '' removes it, and a new name sets it; a new picture starts with a clean record. A first profile that comes with
-- a picture counts as that day's first picture change (chronia_avatar_count lets an account with no profile pass).
create or replace function public.chronia_profile_save(p_user uuid, p_username text, p_key text, p_avatar text,
                                                       p_age boolean, p_name_days integer)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  p public.chronia_profiles;
  v_avatar text := nullif(p_avatar, '');
  v_old text;
  v_rename boolean;
  v_left numeric;
begin
  perform pg_advisory_xact_lock(hashtextextended('chronia-profile|' || p_user::text, 0));
  select * into p from public.chronia_profiles where user_id = p_user for update;

  if not found then
    if p_age is not true then
      return jsonb_build_object('error', 'age');
    end if;
    if coalesce(p_username, '') = '' or coalesce(p_key, '') = '' then
      return jsonb_build_object('error', 'field');
    end if;
    if exists (select 1 from public.chronia_profiles where username_key = p_key) then
      return jsonb_build_object('error', 'taken');
    end if;
    begin
      insert into public.chronia_profiles (user_id, username, username_key, avatar, avatar_changes, avatar_day, age_ok_at)
      values (p_user, p_username, p_key, v_avatar, case when v_avatar is null then 0 else 1 end,
              case when v_avatar is null then null else (now() at time zone 'utc')::date end, now());
    exception when unique_violation then
      return jsonb_build_object('error', 'taken');
    end;
    return jsonb_build_object('ok', true, 'username', p_username, 'avatar', v_avatar, 'old_avatar', null);
  end if;

  if p.blocked then
    return jsonb_build_object('error', 'blocked');
  end if;
  v_rename := coalesce(p_username, '') <> '' and p_username is distinct from p.username;
  if v_rename then
    if coalesce(p_key, '') = '' then
      return jsonb_build_object('error', 'field');
    end if;
    if exists (select 1 from public.chronia_profiles where username_key = p_key and user_id <> p_user) then
      return jsonb_build_object('error', 'taken');
    end if;
    if p.named_at > now() - make_interval(days => p_name_days) then
      v_left := ceil(extract(epoch from p.named_at + make_interval(days => p_name_days) - now()) / 86400);
      return jsonb_build_object('error', 'soon', 'days', greatest(v_left, 1)::integer);
    end if;
  end if;

  begin
    if v_rename then
      update public.chronia_profiles set username = p_username, username_key = p_key, named_at = now()
      where user_id = p_user;
    end if;
    if p_avatar is not null then
      v_old := p.avatar;
      update public.chronia_profiles set avatar = v_avatar, avatar_state = 'ok', avatar_flags = 0 where user_id = p_user;
      delete from public.chronia_flags where target_user = p_user;
    end if;
  exception when unique_violation then
    return jsonb_build_object('error', 'taken');
  end;
  select * into p from public.chronia_profiles where user_id = p_user;
  return jsonb_build_object('ok', true, 'username', p.username, 'avatar', p.avatar, 'old_avatar', v_old);
end;
$$;

-- Counts a picture change for today (UTC) before the paid picture check runs. An account with no profile yet
-- passes uncounted: its first picture is counted when chronia_profile_save makes the profile.
create or replace function public.chronia_avatar_count(p_user uuid, p_cap integer)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  p public.chronia_profiles;
  d date := (now() at time zone 'utc')::date;
  n integer;
begin
  select * into p from public.chronia_profiles where user_id = p_user for update;
  if not found then
    return jsonb_build_object('ok', true, 'left', p_cap - 1);
  end if;
  if p.blocked then
    return jsonb_build_object('error', 'blocked');
  end if;
  n := case when p.avatar_day = d then p.avatar_changes else 0 end;
  if n >= p_cap then
    return jsonb_build_object('error', 'limit');
  end if;
  update public.chronia_profiles set avatar_changes = n + 1, avatar_day = d where user_id = p_user;
  return jsonb_build_object('ok', true, 'left', p_cap - n - 1);
end;
$$;

-- Posts a comment, holding the account's row meanwhile so two posts at once can't both pass the day's cap or
-- the gap between comments. Removed and hidden comments count toward the cap; deleted ones can't.
create or replace function public.chronia_comment_send(p_user uuid, p_polity text, p_at text, p_at_num numeric,
                                                       p_body text, p_cap integer, p_gap_s integer)
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
begin
  select blocked into v_blocked from public.chronia_profiles where user_id = p_user for update;
  if not found then
    return jsonb_build_object('error', 'profile');
  end if;
  if v_blocked then
    return jsonb_build_object('error', 'blocked');
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
  insert into public.chronia_comments (user_id, polity, at, at_num, body)
  values (p_user, p_polity, p_at, p_at_num, p_body)
  returning id, sent_at into v_id, v_sent;
  return jsonb_build_object('id', v_id, 'sent', v_sent, 'left', p_cap - n - 1);
end;
$$;

-- Reports a comment (p_comment) or a picture (p_target), once each per account and p_cap a day. At p_hide
-- reports the comment or the picture is hidden. A repeat changes nothing and answers with "again".
create or replace function public.chronia_flag_add(p_user uuid, p_comment bigint, p_target uuid, p_cap integer,
                                                   p_hide integer)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_blocked boolean;
  v_owner uuid;
  v_state text;
  v_avatar text;
  n integer;
  since timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
begin
  perform pg_advisory_xact_lock(hashtextextended('chronia-flag|' || p_user::text, 0));
  select blocked into v_blocked from public.chronia_profiles where user_id = p_user;
  if not found then
    return jsonb_build_object('error', 'profile');
  end if;
  if v_blocked then
    return jsonb_build_object('error', 'blocked');
  end if;
  if (p_comment is null) = (p_target is null) then
    return jsonb_build_object('error', 'field');
  end if;

  if p_comment is not null then
    select user_id, state, flags into v_owner, v_state, n from public.chronia_comments where id = p_comment for update;
    if not found or v_state <> 'live' then
      return jsonb_build_object('error', 'missing');
    end if;
    if v_owner = p_user then
      return jsonb_build_object('error', 'own');
    end if;
    if exists (select 1 from public.chronia_flags where user_id = p_user and comment_id = p_comment) then
      return jsonb_build_object('ok', true, 'flags', n, 'hidden', false, 'again', true);
    end if;
  else
    if p_target = p_user then
      return jsonb_build_object('error', 'own');
    end if;
    select avatar, avatar_state, avatar_flags into v_avatar, v_state, n
    from public.chronia_profiles where user_id = p_target for update;
    if not found or v_avatar is null or v_state <> 'ok' then
      return jsonb_build_object('error', 'missing');
    end if;
    if exists (select 1 from public.chronia_flags where user_id = p_user and target_user = p_target) then
      return jsonb_build_object('ok', true, 'flags', n, 'hidden', false, 'again', true);
    end if;
  end if;

  if (select count(*) from public.chronia_flags where user_id = p_user and sent_at >= since) >= p_cap then
    return jsonb_build_object('error', 'limit');
  end if;
  insert into public.chronia_flags (user_id, comment_id, target_user) values (p_user, p_comment, p_target);

  if p_comment is not null then
    select count(*) into n from public.chronia_flags where comment_id = p_comment;
    update public.chronia_comments set flags = n, state = case when n >= p_hide then 'hidden' else state end
    where id = p_comment;
  else
    select count(*) into n from public.chronia_flags where target_user = p_target;
    update public.chronia_profiles set avatar_flags = n,
      avatar_state = case when n >= p_hide then 'hidden' else avatar_state end
    where user_id = p_target;
  end if;
  return jsonb_build_object('ok', true, 'flags', n, 'hidden', n >= p_hide);
end;
$$;

-- A reviewer's appeal: live again, with its reports erased, so old reports can't hide it again.
create or replace function public.chronia_comment_restore(p_comment bigint)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  update public.chronia_comments set state = 'live', flags = 0 where id = p_comment;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  delete from public.chronia_flags where comment_id = p_comment;
  return jsonb_build_object('ok', true, 'comment', public.chronia_comment_row(p_comment));
end;
$$;

-- A reviewer's removal: no longer public, but kept for the team, so it can be undone with a restore.
create or replace function public.chronia_comment_remove(p_comment bigint)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  update public.chronia_comments set state = 'removed' where id = p_comment;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  return jsonb_build_object('ok', true, 'comment', public.chronia_comment_row(p_comment));
end;
$$;

-- A writer deletes their own comment; it and the reports of it are erased.
create or replace function public.chronia_comment_delete(p_user uuid, p_comment bigint)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  delete from public.chronia_comments where id = p_comment and user_id = p_user;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Moves every comment stored under a name the map no longer has to one it does.
create or replace function public.chronia_comments_move(p_from text, p_to text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  n integer;
begin
  update public.chronia_comments set polity = p_to where polity = p_from;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- A reviewer turns a picture on (in good standing again, its reports erased) or off (removed; the old file's
-- name is returned for the caller to delete).
create or replace function public.chronia_avatar_set(p_user uuid, p_on boolean)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_old text;
begin
  select avatar into v_old from public.chronia_profiles where user_id = p_user for update;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  if p_on then
    update public.chronia_profiles set avatar_state = 'ok', avatar_flags = 0 where user_id = p_user;
    delete from public.chronia_flags where target_user = p_user;
    return jsonb_build_object('ok', true, 'avatar', v_old);
  end if;
  update public.chronia_profiles set avatar_state = 'removed', avatar = null where user_id = p_user;
  return jsonb_build_object('ok', true, 'avatar', v_old);
end;
$$;

-- Blocks an account (its comments leave the threads and it can't post, report, or change its profile), or
-- unblocks it.
create or replace function public.chronia_block(p_user uuid, p_on boolean)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  update public.chronia_profiles set blocked = p_on where user_id = p_user;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Erases an account's profile, comments, and reports (and the reports of its comments), for an account deleted
-- on request or found to be under age, and recounts what it had reported. The sign-in account is left alone.
-- Returns the picture's file name for the caller to delete. Erasing an account with no profile is harmless.
create or replace function public.chronia_account_erase(p_user uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_avatar text;
  v_comments bigint[];
  v_pictures uuid[];
begin
  select avatar into v_avatar from public.chronia_profiles where user_id = p_user for update;
  if not found then
    return jsonb_build_object('ok', true, 'avatar', null);
  end if;
  select array_agg(comment_id) filter (where comment_id is not null), array_agg(target_user) filter (where target_user is not null)
  into v_comments, v_pictures
  from public.chronia_flags where user_id = p_user;
  delete from public.chronia_profiles where user_id = p_user;
  update public.chronia_comments c set flags = (select count(*) from public.chronia_flags f where f.comment_id = c.id)
  where c.id = any(v_comments);
  update public.chronia_profiles p set avatar_flags = (select count(*) from public.chronia_flags f where f.target_user = p.user_id)
  where p.user_id = any(v_pictures);
  return jsonb_build_object('ok', true, 'avatar', v_avatar);
end;
$$;

-- A card's thread: live comments under any of p_names, by accounts not blocked. p_sort 'near' orders by distance
-- from p_at_num, then newest; anything else, newest first. A picture shows only while in good standing.
-- p_team adds the team's fields (flags, state, and the writer's account id).
create or replace function public.chronia_thread(p_names text[], p_sort text, p_at_num numeric, p_offset integer,
                                                 p_limit integer, p_viewer uuid, p_team boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_near boolean := p_sort = 'near' and p_at_num is not null;
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_total integer;
  v_rows jsonb;
begin
  select count(*) into v_total
  from public.chronia_comments c join public.chronia_profiles p on p.user_id = c.user_id
  where c.state = 'live' and not p.blocked and c.polity = any(p_names);

  select coalesce(jsonb_agg(x.j order by x.o), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object('id', c.id, 'username', p.username,
             'avatar', case when p.avatar_state = 'ok' then p.avatar end,
             'polity', c.polity, 'at', c.at, 'text', c.body, 'mine', c.user_id = p_viewer and p_viewer is not null)
           || case when p_team then jsonb_build_object('flags', c.flags, 'state', c.state, 'user', c.user_id)
                   else '{}'::jsonb end as j,
           row_number() over (order by case when v_near then abs(c.at_num - p_at_num) end, c.sent_at desc, c.id desc) as o
    from public.chronia_comments c join public.chronia_profiles p on p.user_id = c.user_id
    where c.state = 'live' and not p.blocked and c.polity = any(p_names)
    order by o
    offset v_offset limit v_limit
  ) x;

  return jsonb_build_object('comments', v_rows, 'more', v_offset + jsonb_array_length(v_rows) < v_total, 'total', v_total);
end;
$$;

-- The team's list: every reported or not-live comment (newest first, at most 500), every reported or not-ok
-- picture, every blocked account (so a block can be undone), and every name comments are stored under (so the
-- page can find those the map no longer has).
create or replace function public.chronia_queue()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'comments', coalesce((
      select jsonb_agg(public.chronia_comment_row(q.id) order by q.sent_at desc, q.id desc)
      from (select id, sent_at from public.chronia_comments where flags > 0 or state <> 'live'
            order by sent_at desc, id desc limit 500) q), '[]'::jsonb),
    'pictures', coalesce((
      select jsonb_agg(jsonb_build_object('username', username, 'avatar', avatar, 'user', user_id,
                                          'flags', avatar_flags, 'state', avatar_state) order by username_key)
      from public.chronia_profiles where avatar_flags > 0 or avatar_state <> 'ok'), '[]'::jsonb),
    'blocked', coalesce((
      select jsonb_agg(jsonb_build_object('username', username, 'avatar', avatar, 'user', user_id) order by username_key)
      from public.chronia_profiles where blocked), '[]'::jsonb),
    'names', coalesce((
      select jsonb_agg(polity order by polity) from (select distinct polity from public.chronia_comments) d), '[]'::jsonb));
$$;

-- The signed-in account's own profile (or null) and how many comments it has left today.
create or replace function public.chronia_me(p_user uuid, p_cap integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', (select jsonb_build_object('username', username, 'avatar', avatar, 'avatar_state', avatar_state,
                                          'blocked', blocked, 'named_at', named_at)
                from public.chronia_profiles where user_id = p_user),
    'left', greatest(0, p_cap - (select count(*) from public.chronia_comments
                                 where user_id = p_user
                                   and sent_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'))::integer);
$$;

do $$
declare
  f regprocedure;
begin
  foreach f in array array[
    'public.chronia_comment_row(bigint)',
    'public.chronia_profile_save(uuid, text, text, text, boolean, integer)',
    'public.chronia_avatar_count(uuid, integer)',
    'public.chronia_comment_send(uuid, text, text, numeric, text, integer, integer)',
    'public.chronia_flag_add(uuid, bigint, uuid, integer, integer)',
    'public.chronia_comment_restore(bigint)',
    'public.chronia_comment_remove(bigint)',
    'public.chronia_comment_delete(uuid, bigint)',
    'public.chronia_comments_move(text, text)',
    'public.chronia_avatar_set(uuid, boolean)',
    'public.chronia_block(uuid, boolean)',
    'public.chronia_account_erase(uuid)',
    'public.chronia_thread(text[], text, numeric, integer, integer, uuid, boolean)',
    'public.chronia_queue()',
    'public.chronia_me(uuid, integer)']::regprocedure[] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
