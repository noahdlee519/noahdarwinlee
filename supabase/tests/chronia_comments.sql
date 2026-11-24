-- Tests for 202611240700_chronia_comments.sql, run by tools/db-test.sh on a throwaway cluster. Each block
-- asserts one behaviour and says which in its message. Calls are made as service_role, as the edge function
-- makes them; setting a clock back is done as the cluster's superuser.

create schema t;
create function t.u(n int) returns uuid language sql immutable
  as $$ select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid $$;
grant usage on schema t to anon, authenticated, service_role;
grant execute on function t.u(int) to anon, authenticated, service_role;
insert into auth.users (id) select t.u(n) from generate_series(1, 20) n;

-- ---------------------------------------------------------------- closed to the page

do $$
declare r record;
begin
  for r in select c.relname, c.relrowsecurity from pg_class c
           where c.relnamespace = 'public'::regnamespace
             and c.relname in ('chronia_profiles', 'chronia_comments', 'chronia_flags', 'chronia_avatar_trash') loop
    assert r.relrowsecurity, 'row-level security is on for ' || r.relname;
    assert not has_table_privilege('anon', 'public.' || r.relname, 'select,insert,update,delete,truncate,references,trigger'),
      'anon has no right on ' || r.relname;
    assert not has_table_privilege('authenticated', 'public.' || r.relname, 'select,insert,update,delete,truncate,references,trigger'),
      'authenticated has no right on ' || r.relname;
    assert has_table_privilege('service_role', 'public.' || r.relname, 'select,insert,update,delete'),
      'service_role may read and write ' || r.relname;
  end loop;
  assert (select count(*) from pg_class where relnamespace = 'public'::regnamespace
          and relname in ('chronia_profiles', 'chronia_comments', 'chronia_flags', 'chronia_avatar_trash')) = 4, 'the four tables exist';
  assert not exists (select 1 from pg_policies where tablename like 'chronia\_%'), 'the tables have no policies';
end $$;

do $$
declare r record; n int := 0;
begin
  for r in select p.oid::regprocedure as f from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.proname like 'chronia\_%' loop
    n := n + 1;
    assert not has_function_privilege('anon', r.f, 'execute'), 'anon cannot execute ' || r.f;
    assert not has_function_privilege('authenticated', r.f, 'execute'), 'authenticated cannot execute ' || r.f;
    assert has_function_privilege('service_role', r.f, 'execute'), 'service_role can execute ' || r.f;
    assert exists (select 1 from pg_proc where oid = r.f::oid
                   and array_to_string(proconfig, ',') like '%search_path=%'), r.f || ' has a fixed search_path';
  end loop;
  assert n >= 15, 'every function of the migration is checked (found ' || n || ')';
end $$;

do $$
declare
  q text;
  denied int := 0;
  calls text[] := array[
    'select * from public.chronia_profiles',
    'select * from public.chronia_comments',
    'select * from public.chronia_flags',
    'insert into public.chronia_comments (user_id, polity, at, at_num, body) values (t.u(1), ''x'', ''1'', 1, ''x'')',
    'select public.chronia_profile_save(t.u(1), ''Abc'', ''abc'', null, true, 30)',
    'select public.chronia_avatar_count(t.u(1), 5)',
    'select public.chronia_comment_send(t.u(1), ''x'', ''1'', 1, ''x'', 100, 10)',
    'select public.chronia_flag_add(t.u(1), 1, null, 20, 3)',
    'select public.chronia_comment_restore(1)',
    'select public.chronia_comment_remove(1)',
    'select public.chronia_comment_delete(t.u(1), 1)',
    'select public.chronia_comments_move(''a'', ''b'')',
    'select public.chronia_avatar_set(t.u(1), true)',
    'select public.chronia_block(t.u(1), true)',
    'select public.chronia_account_erase(t.u(1))',
    'select public.chronia_thread(array[''x''], ''new'', 0, 0, 20, null, false)',
    'select public.chronia_queue()',
    'select public.chronia_avatars_expired(30)',
    'select public.chronia_avatar_uncount(t.u(1))',
    'select public.chronia_avatar_moves(null, 50)',
    'select public.chronia_avatar_moved(t.u(1), ''x.webp'', true)',
    'select public.chronia_avatar_trash_take(10)',
    'select public.chronia_avatar_trash_done(array[1]::bigint[])',
    'select * from public.chronia_avatar_trash',
    'select public.chronia_me(t.u(1), 100)'];
  who text;
begin
  foreach who in array array['anon', 'authenticated'] loop
    foreach q in array calls loop
      execute 'set local role ' || who;
      begin
        execute q;
        raise exception 'no error';
      exception when insufficient_privilege then
        denied := denied + 1;
      when others then
        raise exception 'as %, "%" is refused for want of privilege (got: %)', who, q, sqlerrm;
      end;
      reset role;
    end loop;
  end loop;
  assert denied = 2 * array_length(calls, 1), 'anon and authenticated are refused every table and function';
end $$;

set role service_role;

-- ---------------------------------------------------------------- profiles

do $$
declare j jsonb;
begin
  j := public.chronia_profile_save(t.u(1), 'Herodotus', 'herodotus', null, false, 30);
  assert j->>'error' = 'age', 'no profile is made without the age box: ' || j::text;
  j := public.chronia_profile_save(t.u(1), 'Herodotus', 'herodotus', null, null, 30);
  assert j->>'error' = 'age', 'no profile is made with the age box missing: ' || j::text;
  j := public.chronia_profile_save(t.u(1), null, null, null, true, 30);
  assert j->>'error' = 'field', 'no profile is made without a username: ' || j::text;
  assert not exists (select 1 from public.chronia_profiles where user_id = t.u(1)), 'a refused profile leaves no row';
  j := public.chronia_profile_save(t.u(1), 'Herodotus', 'herodotus', null, true, 30);
  assert (j->>'ok')::boolean and j->>'username' = 'Herodotus' and j->'avatar' = 'null', 'a profile is made with the age box: ' || j::text;
  assert (select age_ok_at is not null from public.chronia_profiles where user_id = t.u(1)), 'the age box time is kept';
end $$;

do $$
declare j jsonb;
begin
  j := public.chronia_profile_save(t.u(2), 'HERODOTUS', 'herodotus', null, true, 30);
  assert j->>'error' = 'taken', 'the same name in another case is taken: ' || j::text;
  j := public.chronia_profile_save(t.u(2), 'Thucydides', 'thucydides', 'b1.webp', true, 30);
  assert (j->>'ok')::boolean and j->>'avatar' = 'b1.webp', 'a second account takes another name, with a picture: ' || j::text;
  j := public.chronia_profile_save(t.u(1), 'Thucydides', 'thucydides', null, true, 30);
  assert j->>'error' = 'taken', 'an existing account cannot take a name already held: ' || j::text;
end $$;

do $$
declare j jsonb;
begin
  j := public.chronia_profile_save(t.u(1), 'Herodotus_2', 'herodotus_2', null, null, 30);
  assert j->>'error' = 'soon' and (j->>'days')::int = 30, 'a name change inside 30 days is soon, with days left: ' || j::text;
  j := public.chronia_profile_save(t.u(1), 'Herodotus', 'herodotus', 'a1.webp', null, 30);
  assert (j->>'ok')::boolean and j->>'avatar' = 'a1.webp' and j->'old_avatar' = 'null',
    'the same name with a new picture is not a name change: ' || j::text;
end $$;

reset role;
update public.chronia_profiles set named_at = now() - interval '29 days 1 hour' where user_id = t.u(1);
set role service_role;

do $$
declare j jsonb;
begin
  j := public.chronia_profile_save(t.u(1), 'Herodotus_2', 'herodotus_2', null, null, 30);
  assert j->>'error' = 'soon' and (j->>'days')::int = 1, 'a name change on day 29 is soon, one day left: ' || j::text;
end $$;

reset role;
update public.chronia_profiles set named_at = now() - interval '30 days 1 minute' where user_id = t.u(1);
set role service_role;

do $$
declare j jsonb;
begin
  j := public.chronia_profile_save(t.u(1), 'Herodotus_2', 'herodotus_2', null, null, 30);
  assert (j->>'ok')::boolean and j->>'username' = 'Herodotus_2', 'a name change after 30 days is allowed: ' || j::text;
  assert (select username_key from public.chronia_profiles where user_id = t.u(1)) = 'herodotus_2', 'the key changes with it';
  assert (select named_at > now() - interval '1 minute' from public.chronia_profiles where user_id = t.u(1)),
    'the change restarts the 30 days';
  j := public.chronia_profile_save(t.u(3), 'Herodotus', 'herodotus', null, true, 30);
  assert (j->>'ok')::boolean, 'the old name is free again: ' || j::text;
  j := public.chronia_profile_save(t.u(1), 'HERODOTUS_2', 'herodotus_2', null, null, 30);
  assert j->>'error' = 'soon', 'a change of case alone is a name change too: ' || j::text;
end $$;

do $$
declare j jsonb;
begin
  assert (select username_fold from public.chronia_profiles where user_id = t.u(3)) = 'herodotus', 'a profile keeps its folded name';
  j := public.chronia_profile_save(t.u(7), 'Her0dotus', 'her0dotus', null, true, 30, 'herodotus');
  assert j->>'error' = 'taken', 'Her0dotus is taken by Herodotus: ' || j::text;
  j := public.chronia_profile_save(t.u(7), 'Iliad', 'iliad', null, true, 30, 'lllad');
  assert (j->>'ok')::boolean, 'Iliad is free: ' || j::text;
  j := public.chronia_profile_save(t.u(8), 'lliad', 'lliad', null, true, 30, 'lllad');
  assert j->>'error' = 'taken', 'lliad is taken by Iliad: ' || j::text;
  j := public.chronia_profile_save(t.u(8), 'EssexMan', 'essexman', null, true, 30, 'essexman');
  assert (j->>'ok')::boolean, 'EssexMan is free: ' || j::text;
  j := public.chronia_profile_save(t.u(15), 'Essex_Man', 'essex_man', null, true, 30, 'essexman');
  assert j->>'error' = 'taken', 'Essex_Man is taken by EssexMan: ' || j::text;
  j := public.chronia_profile_save(t.u(15), 'Essex_Man', 'essex_man', null, true, 30, null);
  assert j->>'error' = 'taken', 'a save with no fold given folds the name itself: ' || j::text;
  j := public.chronia_profile_save(t.u(7), 'ILIAD', 'iliad', null, null, 30, 'lllad');
  assert j->>'error' = 'soon', 'one''s own name in another case is one''s own, not taken: ' || j::text;
  begin
    perform public.chronia_profile_save(t.u(15), 'Abcdef', 'abcdef', null, true, 30, 'zzz');
    raise exception 'no error';
  exception when check_violation then null;
  end;
  assert (select username_fold from public.chronia_profiles where user_id = t.u(99)) = 'seededpre',
    'the migration fills the folded name of a profile made before it';
end $$;

do $$
declare j jsonb;
begin
  j := public.chronia_profile_save(t.u(1), null, null, 'a2.webp', null, 30);
  assert (j->>'ok')::boolean and j->>'avatar' = 'a2.webp' and j->>'old_avatar' = 'a1.webp',
    'a new picture returns the old one to be deleted: ' || j::text;
  j := public.chronia_profile_save(t.u(1), null, null, '', null, 30);
  assert (j->>'ok')::boolean and j->'avatar' = 'null' and j->>'old_avatar' = 'a2.webp', 'an empty picture removes it: ' || j::text;
  j := public.chronia_profile_save(t.u(1), null, null, 'a3.webp', null, 30);
  assert j->>'avatar' = 'a3.webp', 'a picture can be set again: ' || j::text;
end $$;

do $$
declare j jsonb;
begin
  for i in 1..8 loop
    j := public.chronia_avatar_count(t.u(9), 5);
    assert j->>'error' = 'profile', 'an account with no profile gets no picture check, however often it asks: ' || j::text;
  end loop;
  j := public.chronia_profile_save(t.u(9), 'Polybius', 'polybius', 'p0.webp', true, 30);
  assert (select avatar_changes = 0 from public.chronia_profiles where user_id = t.u(9)),
    'making a profile counts no picture change: the function counts each picture before its check';
  for i in 1..5 loop
    j := public.chronia_avatar_count(t.u(9), 5);
    assert (j->>'ok')::boolean and (j->>'left')::int = 5 - i, 'picture change ' || i || ' of 5 is allowed: ' || j::text;
  end loop;
  j := public.chronia_avatar_count(t.u(9), 5);
  assert j->>'error' = 'limit', 'a sixth picture change in a day is refused: ' || j::text;
  j := public.chronia_avatar_uncount(t.u(9));
  assert (j->>'ok')::boolean, 'a change whose check could not be made is given back: ' || j::text;
  j := public.chronia_avatar_count(t.u(9), 5);
  assert (j->>'ok')::boolean and (j->>'left')::int = 0, 'the change given back can be used again: ' || j::text;
  assert public.chronia_avatar_count(t.u(9), 5)->>'error' = 'limit', 'and then the cap holds again';
  perform public.chronia_avatar_uncount(t.u(3));
  perform public.chronia_avatar_uncount(t.u(3));
  assert (select avatar_changes from public.chronia_profiles where user_id = t.u(3)) = 0, 'giving back never goes below none';
  assert (public.chronia_avatar_uncount(t.u(19))->>'ok')::boolean, 'giving back for no profile is harmless';
  j := public.chronia_avatar_count(t.u(3), 5);
  assert (j->>'left')::int = 4, 'another account has its own count: ' || j::text;
end $$;

reset role;
update public.chronia_profiles set avatar_day = (now() at time zone 'utc')::date - 1 where user_id = t.u(9);
set role service_role;

do $$
declare j jsonb;
begin
  j := public.chronia_avatar_count(t.u(9), 5);
  assert (j->>'ok')::boolean and (j->>'left')::int = 4, 'yesterday''s picture changes do not count today: ' || j::text;
end $$;

-- ---------------------------------------------------------------- comments

do $$
declare j jsonb;
begin
  j := public.chronia_comment_send(t.u(10), 'France', '1789-07-14', 1789.53, 'Liberty', 100, 10);
  assert j->>'error' = 'profile', 'an account with no profile cannot comment: ' || j::text;
  j := public.chronia_comment_send(t.u(1), 'France', '1789-07-14', 1789.53, 'The Bastille falls.', 100, 10);
  assert (j->>'id') is not null and (j->>'left')::int = 99 and (j->>'sent') is not null, 'a comment lands: ' || j::text;
end $$;

do $$
declare j jsonb;
begin
  j := public.chronia_comment_send(t.u(1), 'France', '1789-07-14', 1789.53, 'Again', 100, 10);
  assert j->>'error' = 'fast' and (j->>'wait')::int between 1 and 10, 'a second comment within 10 seconds is fast: ' || j::text;
  assert (select count(*) from public.chronia_comments where user_id = t.u(1)) = 1, 'the fast one is not stored';
end $$;

do $$
declare j jsonb;
begin
  begin
    perform public.chronia_comment_send(t.u(2), 'France', '1789', 1789, repeat('x', 501), 100, 0);
    raise exception 'no error';
  exception when check_violation then null;
  end;
  begin
    perform public.chronia_comment_send(t.u(2), repeat('x', 201), '1789', 1789, 'x', 100, 0);
    raise exception 'no error';
  exception when check_violation then null;
  end;
  j := public.chronia_comment_send(t.u(2), 'France', '1789', 1789, repeat('x', 500), 100, 0);
  assert (j->>'id') is not null, 'a comment of 500 characters lands, of 501 does not: ' || j::text;
  reset role;
  delete from public.chronia_comments where user_id = t.u(2);
end $$;
set role service_role;

do $$
declare j jsonb;
begin
  j := public.chronia_profile_save(t.u(4), 'Livy', 'livy', null, true, 30);
  for i in 1..99 loop
    j := public.chronia_comment_send(t.u(4), 'Rome', '-0200', -200, 'Comment ' || i, 100, 0);
    assert (j->>'id') is not null and (j->>'left')::int = 100 - i, 'comment ' || i || ' of the day lands: ' || j::text;
  end loop;
  update public.chronia_comments set state = 'removed' where user_id = t.u(4) and body in ('Comment 1', 'Comment 2');
  update public.chronia_comments set state = 'hidden' where user_id = t.u(4) and body = 'Comment 3';
  j := public.chronia_comment_send(t.u(4), 'Rome', '-0200', -200, 'Comment 100', 100, 0);
  assert (j->>'id') is not null and (j->>'left')::int = 0, 'the 100th comment of a day lands: ' || j::text;
  j := public.chronia_comment_send(t.u(4), 'Rome', '-0200', -200, 'Comment 101', 100, 0);
  assert j->>'error' = 'limit', 'the 101st comment of a day is limit, counting removed and hidden ones: ' || j::text;
  assert (select count(*) from public.chronia_comments where user_id = t.u(4)) = 100, 'the 101st is not stored';
end $$;

reset role;
do $$
begin
  perform public.chronia_profile_save(t.u(5), 'Tacitus', 'tacitus', null, true, 30);
  insert into public.chronia_comments (user_id, polity, at, at_num, body, sent_at)
  select t.u(5), 'Rome', '0098', 98, 'Old ' || i, date_trunc('day', now() at time zone 'utc') at time zone 'utc' - interval '1 minute'
  from generate_series(1, 100) i;
end $$;
set role service_role;

do $$
declare j jsonb;
begin
  j := public.chronia_comment_send(t.u(5), 'Rome', '0098', 98, 'New today', 100, 10);
  assert (j->>'id') is not null and (j->>'left')::int = 99, 'yesterday''s comments do not count toward today: ' || j::text;
end $$;

do $$
declare j jsonb; c bigint;
begin
  j := public.chronia_profile_save(t.u(6), 'Procopius', 'procopius', null, true, 30);
  c := (public.chronia_comment_send(t.u(1), 'Byzantium', '0540', 540, 'Belisarius', 100, 0)->>'id')::bigint;
  perform public.chronia_block(t.u(6), true);
  j := public.chronia_comment_send(t.u(6), 'Byzantium', '0540', 540, 'Secret History', 100, 0);
  assert j->>'error' = 'blocked', 'a blocked account cannot comment: ' || j::text;
  j := public.chronia_flag_add(t.u(6), c, null, 20, 3);
  assert j->>'error' = 'blocked', 'a blocked account cannot flag: ' || j::text;
  j := public.chronia_profile_save(t.u(6), null, null, 'x.webp', null, 30);
  assert j->>'error' = 'blocked', 'a blocked account cannot change its profile: ' || j::text;
  j := public.chronia_avatar_count(t.u(6), 5);
  assert j->>'error' = 'blocked', 'a blocked account cannot start a picture change: ' || j::text;
  j := public.chronia_flag_add(t.u(10), c, null, 20, 3);
  assert j->>'error' = 'profile', 'an account with no profile cannot flag: ' || j::text;
  j := public.chronia_flag_add(t.u(1), c, null, 20, 3);
  assert j->>'error' = 'own', 'flagging one''s own comment is own: ' || j::text;
  j := public.chronia_flag_add(t.u(1), null, t.u(1), 20, 3);
  assert j->>'error' = 'own', 'flagging one''s own picture is own: ' || j::text;
  j := public.chronia_flag_add(t.u(2), null, null, 20, 3);
  assert j->>'error' = 'field', 'a flag needs a comment or a picture: ' || j::text;
  j := public.chronia_flag_add(t.u(2), c, t.u(1), 20, 3);
  assert j->>'error' = 'field', 'a flag takes a comment or a picture, not both: ' || j::text;
  j := public.chronia_flag_add(t.u(2), 999999, null, 20, 3);
  assert j->>'error' = 'missing', 'flagging a comment that is not there is missing: ' || j::text;
  j := public.chronia_flag_add(t.u(2), null, t.u(4), 20, 3);
  assert j->>'error' = 'missing', 'flagging an account with no picture is missing: ' || j::text;
  assert not exists (select 1 from public.chronia_flags), 'refused flags store nothing';
  perform public.chronia_block(t.u(6), false);
end $$;

-- ---------------------------------------------------------------- flags on a comment

do $$
declare j jsonb; c bigint;
begin
  c := (public.chronia_comment_send(t.u(1), 'Carthage', '-0146', -146, 'Carthago delenda est', 100, 0)->>'id')::bigint;
  j := public.chronia_flag_add(t.u(2), c, null, 20, 3);
  assert (j->>'ok')::boolean and (j->>'flags')::int = 1 and not (j->>'hidden')::boolean, 'a first flag counts one: ' || j::text;
  j := public.chronia_flag_add(t.u(2), c, null, 20, 3);
  assert (j->>'again')::boolean and (j->>'flags')::int = 1, 'one account flagging twice counts once: ' || j::text;
  j := public.chronia_flag_add(t.u(3), c, null, 20, 3);
  assert (j->>'flags')::int = 2 and not (j->>'hidden')::boolean, 'two flags do not hide: ' || j::text;
  assert jsonb_array_length(public.chronia_thread(array['Carthage'], 'new', 0, 0, 20, null, false)->'comments') = 1,
    'a comment with two flags is still in the thread';
  j := public.chronia_flag_add(t.u(4), c, null, 20, 3);
  assert (j->>'flags')::int = 3 and (j->>'hidden')::boolean, 'three flags from three accounts hide a comment: ' || j::text;
  assert (select state from public.chronia_comments where id = c) = 'hidden', 'the comment is stored as hidden';
  j := public.chronia_thread(array['Carthage'], 'new', 0, 0, 20, null, false);
  assert jsonb_array_length(j->'comments') = 0 and (j->>'total')::int = 0, 'the thread no longer lists a hidden comment: ' || j::text;
  assert exists (select 1 from jsonb_array_elements(public.chronia_queue()->'comments') e
                 where (e->>'id')::bigint = c and e->>'state' = 'hidden' and (e->>'flags')::int = 3
                   and e->>'username' = 'Herodotus_2' and e->>'text' = 'Carthago delenda est' and e->>'user' = t.u(1)::text),
    'the queue lists the hidden comment with its flags and its writer';
  j := public.chronia_flag_add(t.u(5), c, null, 20, 3);
  assert j->>'error' = 'missing', 'a fourth flag on a hidden comment is missing: ' || j::text;
  assert (select flags from public.chronia_comments where id = c) = 3, 'the fourth flag changes nothing';

  j := public.chronia_comment_restore(c);
  assert (j->>'ok')::boolean and j->'comment'->>'state' = 'live' and (j->'comment'->>'flags')::int = 0,
    'restore brings a comment back with no flags: ' || j::text;
  assert not exists (select 1 from public.chronia_flags where comment_id = c), 'restore deletes the comment''s flags';
  assert jsonb_array_length(public.chronia_thread(array['Carthage'], 'new', 0, 0, 20, null, false)->'comments') = 1,
    'a restored comment is in the thread again';
  assert not exists (select 1 from jsonb_array_elements(public.chronia_queue()->'comments') e where (e->>'id')::bigint = c),
    'a restored comment leaves the queue';
  j := public.chronia_flag_add(t.u(2), c, null, 20, 3);
  assert (j->>'ok')::boolean and (j->>'again') is null and (j->>'flags')::int = 1, 'after a restore an old flagger''s flag is new: ' || j::text;
  j := public.chronia_flag_add(t.u(3), c, null, 20, 3);
  assert not (j->>'hidden')::boolean, 'after a restore two new flags do not hide: ' || j::text;
  j := public.chronia_flag_add(t.u(5), c, null, 20, 3);
  assert (j->>'hidden')::boolean, 'after a restore it takes three new flags to hide again: ' || j::text;

  j := public.chronia_comment_remove(c);
  assert (j->>'ok')::boolean and j->'comment'->>'state' = 'removed', 'remove marks a comment removed: ' || j::text;
  assert exists (select 1 from public.chronia_comments where id = c), 'a removed comment is kept for the team';
  assert exists (select 1 from jsonb_array_elements(public.chronia_queue()->'comments') e
                 where (e->>'id')::bigint = c and e->>'state' = 'removed'), 'the queue lists a removed comment';
  assert public.chronia_comment_remove(999999)->>'error' = 'missing', 'removing a comment that is not there is missing';
  assert public.chronia_comment_restore(999999)->>'error' = 'missing', 'restoring a comment that is not there is missing';
end $$;

do $$
declare j jsonb; ids bigint[];
begin
  select array_agg(id order by id) into ids from (select id from public.chronia_comments where user_id = t.u(4) and state = 'live' limit 3) s;
  j := public.chronia_flag_add(t.u(9), ids[1], null, 2, 3);
  assert (j->>'ok')::boolean, 'a first report of the day lands: ' || j::text;
  j := public.chronia_flag_add(t.u(9), ids[2], null, 2, 3);
  assert (j->>'ok')::boolean, 'a second report lands: ' || j::text;
  j := public.chronia_flag_add(t.u(9), ids[1], null, 2, 3);
  assert (j->>'again')::boolean, 'a repeat at the cap is again, not limit: ' || j::text;
  j := public.chronia_flag_add(t.u(9), ids[3], null, 2, 3);
  assert j->>'error' = 'limit', 'reports past the day''s cap are limit: ' || j::text;
end $$;

-- ---------------------------------------------------------------- flags on a picture

do $$
declare j jsonb; c bigint;
begin
  c := (public.chronia_comment_send(t.u(2), 'Athens', '-0431', -431, 'The war begins', 100, 0)->>'id')::bigint;
  assert public.chronia_thread(array['Athens'], 'new', 0, 0, 20, null, false)->'comments'->0->>'avatar' = 'b1.webp',
    'the thread shows a picture in good standing';
  j := public.chronia_flag_add(t.u(1), null, t.u(2), 20, 3);
  assert (j->>'flags')::int = 1 and not (j->>'hidden')::boolean, 'a first picture flag counts one: ' || j::text;
  j := public.chronia_flag_add(t.u(1), null, t.u(2), 20, 3);
  assert (j->>'again')::boolean, 'flagging a picture twice counts once: ' || j::text;
  j := public.chronia_flag_add(t.u(3), null, t.u(2), 20, 3);
  j := public.chronia_flag_add(t.u(4), null, t.u(2), 20, 3);
  assert (j->>'flags')::int = 3 and (j->>'hidden')::boolean, 'three picture flags hide a picture: ' || j::text;
  assert (select avatar_state from public.chronia_profiles where user_id = t.u(2)) = 'hidden', 'the picture is stored as hidden';
  j := public.chronia_thread(array['Athens'], 'new', 0, 0, 20, null, false);
  assert j->'comments'->0->'avatar' = 'null' and j->'comments'->0->>'username' = 'Thucydides',
    'the thread shows a hidden picture''s comment with no picture: ' || j::text;
  assert exists (select 1 from jsonb_array_elements(public.chronia_queue()->'pictures') e
                 where e->>'user' = t.u(2)::text and e->>'state' = 'hidden' and (e->>'flags')::int = 3 and e->>'avatar' = 'b1.webp'),
    'the queue lists the hidden picture';
  j := public.chronia_flag_add(t.u(5), null, t.u(2), 20, 3);
  assert j->>'error' = 'missing', 'a flag on a hidden picture is missing: ' || j::text;

  j := public.chronia_profile_save(t.u(2), null, null, 'b2.webp', null, 30);
  assert j->>'old_avatar' = 'b1.webp', 'a new picture replaces the hidden one: ' || j::text;
  assert (select avatar_state = 'ok' and avatar_flags = 0 from public.chronia_profiles where user_id = t.u(2)),
    'a new picture is in good standing with no flags';
  assert not exists (select 1 from public.chronia_flags where target_user = t.u(2)), 'a new picture clears the old one''s flags';
  assert public.chronia_thread(array['Athens'], 'new', 0, 0, 20, null, false)->'comments'->0->>'avatar' = 'b2.webp',
    'the thread shows the new picture';

  perform public.chronia_flag_add(t.u(1), null, t.u(2), 20, 3);
  j := public.chronia_avatar_set(t.u(2), false);
  assert (j->>'ok')::boolean and j->>'avatar' = 'b2.webp', 'turning a picture off returns its file: ' || j::text;
  assert (select avatar is null and avatar_state = 'removed' from public.chronia_profiles where user_id = t.u(2)),
    'a picture turned off is removed';
  assert exists (select 1 from jsonb_array_elements(public.chronia_queue()->'pictures') e
                 where e->>'user' = t.u(2)::text and e->>'state' = 'removed'), 'the queue lists a removed picture';
  j := public.chronia_avatar_set(t.u(2), true);
  assert (j->>'ok')::boolean and (select avatar_state = 'ok' and avatar_flags = 0 from public.chronia_profiles where user_id = t.u(2)),
    'turning a picture on clears its state and flags: ' || j::text;
  assert not exists (select 1 from public.chronia_flags where target_user = t.u(2)), 'turning a picture on deletes its flags';
  assert public.chronia_avatar_set(t.u(19), true)->>'error' = 'missing', 'a picture of no profile is missing';
end $$;

-- A picture a reviewer removes is kept for the team for a while, so the removal can be undone, then forgotten.

do $$
declare j jsonb;
begin
  j := public.chronia_avatar_set(t.u(2), false);
  assert (j->>'ok')::boolean and j->>'avatar' = 'b2.webp' and j->'removed_avatar' = 'null',
    'turning a picture off keeps its file, with nothing to delete: ' || j::text;
  assert (select avatar is null and avatar_removed = 'b2.webp' and avatar_removed_at > now() - interval '1 minute'
          from public.chronia_profiles where user_id = t.u(2)), 'a removed picture''s file name is kept, with the time';
  assert public.chronia_thread(array['Athens'], 'new', 0, 0, 20, null, false)->'comments'->0->'avatar' = 'null',
    'the thread shows no removed picture';
  assert exists (select 1 from jsonb_array_elements(public.chronia_queue()->'pictures') e
                 where e->>'user' = t.u(2)::text and e->>'state' = 'removed' and e->>'avatar' = 'b2.webp'),
    'the queue shows the team a removed picture while it is kept';
  j := public.chronia_avatar_set(t.u(2), false);
  assert (j->>'ok')::boolean and (select avatar_removed = 'b2.webp' from public.chronia_profiles where user_id = t.u(2)),
    'turning a removed picture off again keeps the same file: ' || j::text;
  j := public.chronia_avatar_set(t.u(2), true);
  assert (j->>'ok')::boolean and j->>'avatar' = 'b2.webp', 'turning a kept picture on restores it: ' || j::text;
  assert (select avatar = 'b2.webp' and avatar_state = 'ok' and avatar_removed is null and avatar_removed_at is null
          from public.chronia_profiles where user_id = t.u(2)), 'a restored picture is live and no longer kept aside';
  assert public.chronia_thread(array['Athens'], 'new', 0, 0, 20, null, false)->'comments'->0->>'avatar' = 'b2.webp',
    'the thread shows a restored picture';

  perform public.chronia_avatar_set(t.u(2), false);
  j := public.chronia_profile_save(t.u(2), null, null, 'b4.webp', null, 30);
  assert (j->>'ok')::boolean and j->>'avatar' = 'b4.webp' and j->>'avatar_state' = 'ok' and j->>'removed_avatar' = 'b2.webp'
         and j->'old_avatar' = 'null', 'a new picture from its owner gives up the kept one, to be deleted: ' || j::text;
  assert (select avatar_removed is null and avatar_removed_at is null from public.chronia_profiles where user_id = t.u(2)),
    'a new picture clears the kept one';
  j := public.chronia_profile_save(t.u(2), null, null, null, null, 30);
  assert j->'removed_avatar' = 'null', 'a save with no picture has nothing to delete: ' || j::text;
  j := public.chronia_avatar_set(t.u(2), false);
  j := public.chronia_profile_save(t.u(2), null, null, '', null, 30);
  assert j->>'removed_avatar' = 'b4.webp' and j->'avatar' = 'null', 'its owner removing the picture gives up the kept one too: ' || j::text;
  perform public.chronia_profile_save(t.u(2), null, null, 'b2.webp', null, 30);
end $$;

do $$
declare j jsonb;
begin
  perform public.chronia_flag_add(t.u(1), null, t.u(9), 20, 3);
  perform public.chronia_avatar_set(t.u(2), false);
  perform public.chronia_avatar_set(t.u(9), false);
  assert (select avatar_removed = 'p0.webp' from public.chronia_profiles where user_id = t.u(9)), 'a second picture is kept';
  j := public.chronia_avatars_expired(30);
  assert j = '[]'::jsonb, 'no kept picture is expired on its first day: ' || j::text;
end $$;

reset role;
update public.chronia_profiles set avatar_removed_at = now() - interval '31 days' where user_id = t.u(2);
set role service_role;

do $$
declare j jsonb;
begin
  j := public.chronia_avatars_expired(30);
  assert j = '["b2.webp"]'::jsonb, 'a picture kept over 30 days is expired and returned to be deleted: ' || j::text;
  assert (select avatar is null and avatar_removed is null and avatar_removed_at is null
          from public.chronia_profiles where user_id = t.u(2)), 'an expired picture is forgotten';
  assert (select avatar_removed = 'p0.webp' from public.chronia_profiles where user_id = t.u(9)), 'a recent one is still kept';
  assert exists (select 1 from public.chronia_flags where target_user = t.u(9))
         and (select avatar_state = 'removed' and avatar_flags = 1 from public.chronia_profiles where user_id = t.u(9)),
    'a recent kept picture keeps its state and its reports';
  assert public.chronia_avatars_expired(30) = '[]'::jsonb, 'an expired picture is returned only once';
  j := public.chronia_avatar_set(t.u(2), true);
  assert (j->>'ok')::boolean and j->'avatar' = 'null', 'an expired picture cannot be turned on again: ' || j::text;
  assert exists (select 1 from public.chronia_avatar_trash where name = 'b2.webp' and bucket = 'chronia-avatars'),
    'an expired picture goes to the trash, for the sweep to delete';
  j := public.chronia_account_erase(t.u(9));
  assert (j->>'ok')::boolean and j->'avatar' = 'null' and j->>'removed_avatar' = 'p0.webp',
    'erase returns a kept picture''s file too: ' || j::text;
  assert exists (select 1 from public.chronia_avatar_trash where name = 'p0.webp'), 'erase puts the files in the trash';
end $$;

do $$
declare j jsonb; m jsonb;
begin
  perform public.chronia_profile_save(t.u(16), 'Strabo', 'strabo', null, true, 30);
  perform public.chronia_profile_save(t.u(16), null, null, 's1.webp', null, 30);
  perform public.chronia_comment_send(t.u(16), 'Pontus', '0020', 20, 'Geography', 100, 0);
  assert (select not avatar_kept from public.chronia_profiles where user_id = t.u(16)), 'a new picture is in the public bucket';
  assert public.chronia_avatar_moves(null, 50) = '[]'::jsonb, 'nothing to move while every picture is where it belongs: '
    || public.chronia_avatar_moves(null, 50)::text;
  perform public.chronia_flag_add(t.u(1), null, t.u(16), 20, 3);
  perform public.chronia_flag_add(t.u(3), null, t.u(16), 20, 3);
  perform public.chronia_flag_add(t.u(4), null, t.u(16), 20, 3);
  m := public.chronia_avatar_moves(t.u(16), 50);
  assert m = jsonb_build_array(jsonb_build_object('user', t.u(16), 'name', 's1.webp', 'kept', true)),
    'a picture hidden by reports is to move to the private bucket: ' || m::text;
  j := public.chronia_avatar_moved(t.u(16), 'other.webp', true);
  assert not (j->>'ok')::boolean and (select not avatar_kept from public.chronia_profiles where user_id = t.u(16)),
    'a move is recorded only for the file the profile still has: ' || j::text;
  j := public.chronia_avatar_moved(t.u(16), 's1.webp', true);
  assert (j->>'ok')::boolean and (select avatar_kept from public.chronia_profiles where user_id = t.u(16)), 'a move is recorded: ' || j::text;
  assert public.chronia_avatar_moves(t.u(16), 50) = '[]'::jsonb, 'a moved picture has nothing left to move';
  assert exists (select 1 from jsonb_array_elements(public.chronia_queue()->'pictures') e
                 where e->>'user' = t.u(16)::text and (e->>'kept')::boolean and e->>'avatar' = 's1.webp'),
    'the queue says the picture is in the private bucket';
  assert (public.chronia_comment_row((select id from public.chronia_comments where user_id = t.u(16)))->>'avatar_kept')::boolean,
    'a comment as the team sees it says where its writer''s picture is';

  j := public.chronia_avatar_set(t.u(16), true);
  m := public.chronia_avatar_moves(t.u(16), 50);
  assert m = jsonb_build_array(jsonb_build_object('user', t.u(16), 'name', 's1.webp', 'kept', false)),
    'a picture a reviewer keeps is to move back to the public bucket: ' || m::text;
  assert public.chronia_thread(array['Pontus'], 'new', 0, 0, 20, null, false)->'comments'->0->'avatar' = 'null',
    'the thread shows no picture until it is back in the public bucket';
  assert (public.chronia_me(t.u(16), 100)->'profile'->>'avatar_kept')::boolean, 'me says where the picture is';
  perform public.chronia_avatar_moved(t.u(16), 's1.webp', false);
  assert public.chronia_thread(array['Pontus'], 'new', 0, 0, 20, null, false)->'comments'->0->>'avatar' = 's1.webp',
    'the thread shows the picture once it is back';

  perform public.chronia_avatar_set(t.u(16), false);
  m := public.chronia_avatar_moves(null, 50);
  assert m = jsonb_build_array(jsonb_build_object('user', t.u(16), 'name', 's1.webp', 'kept', true)),
    'a picture a reviewer removes is to move to the private bucket: ' || m::text;
  perform public.chronia_avatar_moved(t.u(16), 's1.webp', true);
  j := public.chronia_profile_save(t.u(16), null, null, 's2.webp', null, 30);
  assert j->>'removed_avatar' = 's1.webp' and (select not avatar_kept from public.chronia_profiles where user_id = t.u(16)),
    'a new picture is public, and the kept one is given up: ' || j::text;

  perform public.chronia_profile_save(t.u(17), 'Pausanias', 'pausanias', null, true, 30);
  perform public.chronia_profile_save(t.u(17), null, null, 't1.webp', null, 30);
  perform public.chronia_avatar_set(t.u(17), false);
  perform public.chronia_avatar_moved(t.u(17), 't1.webp', true);
  perform public.chronia_profile_save(t.u(18), 'Diodorus', 'diodorus', null, true, 30);
  perform public.chronia_profile_save(t.u(18), null, null, 't3.webp', null, 30);
end $$;

reset role;
delete from public.chronia_avatar_trash;
delete from auth.users where id in (t.u(17), t.u(18)); -- as Supabase deletes a user, past the function
set role service_role;

do $$
declare j jsonb; ids bigint[];
begin
  assert not exists (select 1 from public.chronia_profiles where user_id in (t.u(17), t.u(18))), 'the profiles went with the users';
  j := public.chronia_avatar_trash_take(100);
  assert j @> jsonb_build_array(jsonb_build_object('name', 't1.webp', 'bucket', 'chronia-avatars-kept'),
                                jsonb_build_object('name', 't3.webp', 'bucket', 'chronia-avatars'))
         and jsonb_array_length(j) = 2, 'deleting a user puts its picture files in the trash, each with its bucket: ' || j::text;
  assert public.chronia_avatar_trash_take(1) ->> 0 is not null and jsonb_array_length(public.chronia_avatar_trash_take(1)) = 1,
    'the trash is taken a few at a time';
  select array_agg((e->>'id')::bigint) into ids from jsonb_array_elements(j) e;
  assert public.chronia_avatar_trash_done(ids) = 2, 'files deleted are forgotten';
  assert public.chronia_avatar_trash_take(100) = '[]'::jsonb, 'the trash is empty';
end $$;

-- ---------------------------------------------------------------- threads

reset role;
do $$
begin
  perform public.chronia_profile_save(t.u(11), 'Froissart', 'froissart', 'f.webp', true, 30);
  perform public.chronia_profile_save(t.u(12), 'Joinville', 'joinville', null, true, 30);
  insert into public.chronia_comments (user_id, polity, at, at_num, body, sent_at) values
    (t.u(11), 'Kingdom of France', '1346', 1346.5, 'Crecy',      now() - interval '5 hours'),
    (t.u(12), 'Kingdom of France', '1250', 1250.5, 'Mansurah',   now() - interval '4 hours'),
    (t.u(11), 'French Republic',   '1793', 1793.5, 'Terror',     now() - interval '3 hours'),
    (t.u(12), 'West Francia',      '0900', 900.5,  'Vikings',    now() - interval '2 hours'),
    (t.u(11), 'Kingdom of France', '1356', 1356.5, 'Poitiers',   now() - interval '1 hour'),
    (t.u(12), 'England',           '1346', 1346.5, 'Elsewhere',  now());
end $$;
set role service_role;

do $$
declare j jsonb; names text[] := array['Kingdom of France', 'French Republic', 'West Francia'];
begin
  j := public.chronia_thread(names, 'new', null, 0, 20, null, false);
  assert (select array_agg(e->>'text' order by o) from jsonb_array_elements(j->'comments') with ordinality x(e, o))
         = array['Poitiers', 'Vikings', 'Terror', 'Mansurah', 'Crecy'], 'new sorts a thread newest first across its names: ' || j::text;
  assert (j->>'total')::int = 5 and not (j->>'more')::boolean, 'a short thread has its total and no more: ' || j::text;
  assert j->'comments'->0 ?& array['id', 'username', 'avatar', 'polity', 'at', 'text', 'mine'],
    'a thread comment has its fields: ' || j::text;
  assert not (j->'comments'->0 ? 'user') and not (j->'comments'->0 ? 'flags'), 'a thread for the public has no team fields';
  assert j->'comments'->0->>'avatar' = 'f.webp' and j->'comments'->0->>'polity' = 'Kingdom of France'
         and j->'comments'->0->>'at' = '1356', 'a thread comment carries its picture, name, and date: ' || j::text;

  j := public.chronia_thread(names, 'near', 1340, 0, 20, null, false);
  assert (select array_agg(e->>'text' order by o) from jsonb_array_elements(j->'comments') with ordinality x(e, o))
         = array['Crecy', 'Poitiers', 'Mansurah', 'Vikings', 'Terror'], 'near sorts by distance from the date: ' || j::text;
  j := public.chronia_thread(names, 'near', 1351.5, 0, 20, null, false);
  assert (select array_agg(e->>'text' order by o) from jsonb_array_elements(j->'comments') with ordinality x(e, o))
         = array['Poitiers', 'Crecy', 'Mansurah', 'Terror', 'Vikings'], 'near breaks a tie in distance by newest: ' || j::text;

  j := public.chronia_thread(names, 'new', null, 0, 2, t.u(12), false);
  assert jsonb_array_length(j->'comments') = 2 and (j->>'more')::boolean and (j->>'total')::int = 5, 'a first page has more: ' || j::text;
  assert (j->'comments'->1->>'mine')::boolean and not (j->'comments'->0->>'mine')::boolean, 'mine marks the viewer''s own: ' || j::text;
  j := public.chronia_thread(names, 'new', null, 2, 2, null, false);
  assert (select array_agg(e->>'text' order by o) from jsonb_array_elements(j->'comments') with ordinality x(e, o))
         = array['Terror', 'Mansurah'] and (j->>'more')::boolean, 'the second page follows the first: ' || j::text;
  j := public.chronia_thread(names, 'new', null, 4, 2, null, false);
  assert jsonb_array_length(j->'comments') = 1 and not (j->>'more')::boolean, 'the last page has no more: ' || j::text;
  j := public.chronia_thread(names, 'new', null, 0, 20, null, true);
  assert j->'comments'->0 ?& array['user', 'flags', 'state'], 'a thread for the team has the team''s fields: ' || j::text;

  perform public.chronia_block(t.u(11), true);
  j := public.chronia_thread(names, 'new', null, 0, 20, null, false);
  assert (j->>'total')::int = 2 and not exists (select 1 from jsonb_array_elements(j->'comments') e where e->>'username' = 'Froissart'),
    'a blocked account''s comments leave the thread: ' || j::text;
  assert exists (select 1 from jsonb_array_elements(public.chronia_queue()->'blocked') e where e->>'user' = t.u(11)::text),
    'the queue lists blocked accounts, so a block can be undone';
  perform public.chronia_block(t.u(11), false);
  assert (public.chronia_thread(names, 'new', null, 0, 20, null, false)->>'total')::int = 5, 'unblocking brings them back';
  assert public.chronia_block(t.u(19), true)->>'error' = 'missing', 'blocking an account with no profile is missing';
end $$;

do $$
declare n int; j jsonb;
begin
  n := public.chronia_comments_move('West Francia', 'Kingdom of the West Franks');
  assert n = 1, 'move returns how many comments it renamed: ' || n;
  assert (public.chronia_thread(array['West Francia'], 'new', null, 0, 20, null, false)->>'total')::int = 0, 'the old name is empty';
  assert (public.chronia_thread(array['Kingdom of the West Franks'], 'new', null, 0, 20, null, false)->>'total')::int = 1,
    'the comment is under the new name';
  j := public.chronia_queue();
  assert j->'names' ? 'Kingdom of the West Franks' and not (j->'names' ? 'West Francia') and j->'names' ? 'England',
    'the queue lists every stored name: ' || (j->'names')::text;
  assert public.chronia_comments_move('Nowhere', 'Somewhere') = 0, 'moving an unused name moves nothing';
end $$;

do $$
declare j jsonb; c bigint;
begin
  c := (select id from public.chronia_comments where body = 'Mansurah');
  perform public.chronia_flag_add(t.u(11), c, null, 20, 3);
  j := public.chronia_comment_delete(t.u(11), c);
  assert j->>'error' = 'missing', 'an account cannot delete another''s comment: ' || j::text;
  j := public.chronia_comment_delete(t.u(12), c);
  assert (j->>'ok')::boolean, 'an account deletes its own comment: ' || j::text;
  assert not exists (select 1 from public.chronia_comments where id = c), 'a deleted comment is gone';
  assert not exists (select 1 from public.chronia_flags where comment_id = c), 'a deleted comment''s flags are gone';
  assert public.chronia_comment_delete(t.u(12), c)->>'error' = 'missing', 'deleting it again is missing';
end $$;

do $$
declare j jsonb;
begin
  j := public.chronia_me(t.u(4), 100);
  assert j->'profile'->>'username' = 'Livy' and (j->>'left')::int = 0, 'me gives the profile and the day''s comments left: ' || j::text;
  j := public.chronia_me(t.u(19), 100);
  assert j->'profile' = 'null' and (j->>'left')::int = 100, 'me for an account with no profile: ' || j::text;
end $$;

-- ---------------------------------------------------------------- erase

do $$
declare j jsonb; c bigint; other bigint;
begin
  -- Thucydides (2) has comments, a picture, flags of others' comments, and flags of his comments by others.
  perform public.chronia_profile_save(t.u(2), null, null, 'b3.webp', null, 30);
  c := (select id from public.chronia_comments where user_id = t.u(2) limit 1);
  perform public.chronia_flag_add(t.u(3), c, null, 20, 3);
  perform public.chronia_flag_add(t.u(3), null, t.u(2), 20, 3);
  other := (select id from public.chronia_comments where body = 'Crecy');
  perform public.chronia_flag_add(t.u(2), other, null, 20, 3);
  perform public.chronia_flag_add(t.u(12), other, null, 20, 3);
  assert (select flags from public.chronia_comments where id = other) = 2, 'two flags before the erase';
  j := public.chronia_account_erase(t.u(2));
  assert (j->>'ok')::boolean and j->>'avatar' = 'b3.webp', 'erase returns the picture''s file: ' || j::text;
  assert not exists (select 1 from public.chronia_profiles where user_id = t.u(2)), 'erase removes the profile';
  assert not exists (select 1 from public.chronia_comments where user_id = t.u(2)), 'erase removes the comments';
  assert not exists (select 1 from public.chronia_flags where user_id = t.u(2) or target_user = t.u(2) or comment_id = c),
    'erase removes the flags it made and the flags on it';
  assert (select flags from public.chronia_comments where id = other) = 1, 'erase recounts the comments it had flagged';
  j := public.chronia_account_erase(t.u(2));
  assert (j->>'ok')::boolean and j->'avatar' = 'null', 'erasing again is harmless: ' || j::text;
end $$;

reset role;

-- ---------------------------------------------------------------- two posts at once

create extension dblink schema t;
do $$
begin
  perform public.chronia_profile_save(t.u(13), 'Xenophon', 'xenophon', null, true, 30);
  perform public.chronia_profile_save(t.u(14), 'Arrian', 'arrian', null, true, 30);
  insert into public.chronia_comments (user_id, polity, at, at_num, body)
  select t.u(14), 'Macedon', '-0330', -330, 'Earlier ' || i from generate_series(1, 99) i;
end $$;

-- Two sessions post for one account at once: the second waits for the first's lock, then sees its comment.
do $$
declare
  conn text := format('host=%s port=%s dbname=postgres user=postgres',
                      current_setting('unix_socket_directories'), current_setting('port'));
  r jsonb;
  who int;
  want text;
begin
  foreach who in array array[13, 14] loop
    want := case who when 13 then 'fast' else 'limit' end;
    perform t.dblink_connect('a', conn);
    perform t.dblink_connect('b', conn);
    perform t.dblink_exec('a', 'begin; set local role service_role');
    perform * from t.dblink('a', format('select public.chronia_comment_send(%L, ''Persia'', ''-0401'', -401, ''First'', 100, %s)',
                                        t.u(who), case who when 13 then 10 else 0 end)) as x(j jsonb);
    perform t.dblink_exec('b', 'set role service_role');
    perform t.dblink_send_query('b', format('select public.chronia_comment_send(%L, ''Persia'', ''-0401'', -401, ''Second'', 100, %s)',
                                            t.u(who), case who when 13 then 10 else 0 end));
    perform pg_sleep(0.3);
    assert t.dblink_is_busy('b') = 1, 'a second post for ' || want || ' waits for the first one''s lock';
    perform t.dblink_exec('a', 'commit');
    select j into r from t.dblink_get_result('b') as x(j jsonb);
    perform * from t.dblink_get_result('b') as x(j jsonb);
    assert r->>'error' = want, 'of two posts at once, only one lands (' || want || '): ' || coalesce(r::text, 'null');
    assert (select count(*) from public.chronia_comments where user_id = t.u(who) and polity = 'Persia') = 1,
      'one comment is stored of two posted at once (' || want || ')';
    perform t.dblink_disconnect('a');
    perform t.dblink_disconnect('b');
  end loop;
end $$;

do $$
begin
  assert exists (select 1 from auth.users where id = t.u(2)), 'erase leaves the sign-in account itself';
end $$;

do $$
begin
  assert (select public and file_size_limit = 204800 and allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
          from storage.buckets where id = 'chronia-avatars'), 'the public picture bucket exists with its limits';
  assert (select not public and file_size_limit = 204800 and allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
          from storage.buckets where id = 'chronia-avatars-kept'), 'the private bucket for hidden and removed pictures exists';
end $$;
