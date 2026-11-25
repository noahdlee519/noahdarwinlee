-- Tests for 202611250600_chronia_replies_votes.sql, run by tools/db-test.sh after chronia_comments.sql's (whose
-- schema t and its t.u() they reuse) on the same throwaway cluster. Each block asserts one behaviour and says which in
-- its message. Calls are made as service_role, as the edge function makes them; deleting a sign-in account is done as
-- a stand-in for Supabase's own auth role, which has no right on the comments' tables.

insert into auth.users (id) select t.u(n) from generate_series(31, 60) n;

-- Posts as account n (no gap between posts), and gives the new comment's id; a refusal fails the test.
create function t.post(n int, polity text, body text, parent bigint default null) returns bigint
language plpgsql as $$
declare j jsonb;
begin
  j := public.chronia_comment_send(t.u(n), polity, '1900', 1900, body, 100, 0, parent);
  assert j ? 'id', 'post ' || body || ': ' || j::text;
  return (j->>'id')::bigint;
end $$;
grant execute on function t.post(int, text, text, bigint) to service_role;

-- The ids of a thread's comments, in the order given.
create function t.ids(j jsonb) returns bigint[] language sql immutable as $$
  select coalesce(array_agg((e->>'id')::bigint order by o), '{}') from jsonb_array_elements(j->'comments') with ordinality x(e, o)
$$;
grant execute on function t.ids(jsonb) to service_role;

create role auth_admin nologin;
grant usage on schema auth to auth_admin;
grant select, delete on auth.users to auth_admin;
grant usage on schema t to auth_admin;
grant execute on function t.u(int) to auth_admin;

set role service_role;

-- ---------------------------------------------------------------- closed to the page

do $$
begin
  assert (select relrowsecurity from pg_class where oid = 'public.chronia_votes'::regclass), 'row-level security is on for chronia_votes';
  assert not has_table_privilege('anon', 'public.chronia_votes', 'select,insert,update,delete,truncate,references,trigger'), 'anon has no right on chronia_votes';
  assert not has_table_privilege('authenticated', 'public.chronia_votes', 'select,insert,update,delete,truncate,references,trigger'), 'authenticated has no right on chronia_votes';
  assert has_table_privilege('service_role', 'public.chronia_votes', 'select,insert,delete'), 'service_role may read and write chronia_votes';
  assert not exists (select 1 from pg_policies where tablename = 'chronia_votes'), 'chronia_votes has no policies';
  assert not has_function_privilege('anon', 'public.chronia_vote(uuid, bigint, boolean, integer)', 'execute'), 'anon cannot vote';
  assert not has_function_privilege('authenticated', 'public.chronia_thread_of(bigint, uuid, integer)', 'execute'), 'authenticated cannot read a thread directly';
  assert not has_function_privilege('authenticated', 'public.chronia_mine(uuid, integer, integer)', 'execute'), 'authenticated cannot list an account''s comments';
  assert has_function_privilege('service_role', 'public.chronia_comment_send(uuid, text, text, numeric, text, integer, integer, bigint)', 'execute'), 'service_role can post a reply';
  assert (select count(*) from pg_proc where proname = 'chronia_comment_send' and pronamespace = 'public'::regnamespace) = 1,
    'one chronia_comment_send, so a call by named arguments is never ambiguous';
end $$;

do $$
begin
  assert (select confdeltype from pg_constraint where conname = 'chronia_comments_user_id_fkey') = 'n',
    'a comment''s account is set null, not cascaded, when its profile goes';
  assert (select attnotnull from pg_attribute where attrelid = 'public.chronia_comments'::regclass and attname = 'user_id') = false,
    'a comment''s account may be null (a placeholder)';
end $$;

do $$
begin
  perform public.chronia_profile_save(t.u(31), 'Pericles', 'pericles', null, true, 30);
  perform public.chronia_profile_save(t.u(32), 'Aspasia', 'aspasia', null, true, 30);
  perform public.chronia_profile_save(t.u(33), 'Socrates', 'socrates', null, true, 30);
  perform public.chronia_profile_save(t.u(34), 'Alcibiades', 'alcibiades', null, true, 30);
  perform public.chronia_profile_save(t.u(35), 'Cleon', 'cleon', null, true, 30);
end $$;

-- ---------------------------------------------------------------- replies

do $$
declare top bigint; r1 bigint; r2 bigint; j jsonb;
begin
  top := t.post(31, 'Athens', 'The plague comes.');
  j := public.chronia_comment_send(t.u(32), 'Athens', '-0430', -430, 'And with it, fear.', 100, 0, top);
  r1 := (j->>'id')::bigint;
  assert (j->>'parent')::bigint = top and (j->>'root')::bigint = top and (j->>'depth')::int = 1 and j->'replying_to' = 'null',
    'a reply answers with its parent, its root, and its depth: ' || j::text;
  assert (select parent_id = top and root_id = top and depth = 1 and polity = 'Athens' and at = '-0430' and reply_to is null
          from public.chronia_comments where id = r1), 'a reply is stored under its parent, in its thread, with the writer''s date';
  r2 := t.post(33, 'Athens', 'Fear is the beginning.', r1);
  assert (select parent_id = r1 and root_id = top and depth = 2 from public.chronia_comments where id = r2), 'a reply to a reply keeps the root';
  j := public.chronia_comment_send(t.u(34), 'Sparta', '1900', 1900, 'Wrong name.', 100, 0, r1);
  assert j->>'error' = 'field', 'a reply under a name other than its parent''s is refused: ' || j::text;
  j := public.chronia_comment_send(t.u(34), 'Athens', '1900', 1900, 'To nothing.', 100, 0, 99999999);
  assert j->>'error' = 'gone', 'a reply to a comment that does not exist is gone: ' || j::text;
  update public.chronia_comments set state = 'hidden' where id = r2;
  j := public.chronia_comment_send(t.u(34), 'Athens', '1900', 1900, 'To the hidden.', 100, 0, r2);
  assert j->>'error' = 'gone', 'a reply to a hidden comment is gone: ' || j::text;
  update public.chronia_comments set state = 'removed' where id = r2;
  j := public.chronia_comment_send(t.u(34), 'Athens', '1900', 1900, 'To the removed.', 100, 0, r2);
  assert j->>'error' = 'gone', 'a reply to a removed comment is gone: ' || j::text;
  update public.chronia_comments set state = 'live' where id = r2;
  perform public.chronia_block(t.u(33), true);
  j := public.chronia_comment_send(t.u(34), 'Athens', '1900', 1900, 'To the blocked.', 100, 0, r2);
  assert j->>'error' = 'gone', 'a reply to a blocked account''s comment is gone: ' || j::text;
  perform public.chronia_block(t.u(33), false);
end $$;

do $$
declare ids bigint[] := '{}'; prev bigint := null; i int; j jsonb; last8 bigint; flat bigint; flat2 bigint;
begin
  -- A chain down to depth 8, then replies to the comment at depth 8.
  for i in 0..8 loop
    prev := t.post(31 + i % 2, 'Corinth', 'Level ' || i, prev);
    ids := ids || prev;
  end loop;
  last8 := prev;
  assert (select array_agg(depth order by id) from public.chronia_comments where id = any(ids)) = array[0,1,2,3,4,5,6,7,8]::smallint[],
    'a chain of replies goes down to depth 8';
  j := public.chronia_comment_send(t.u(33), 'Corinth', '1900', 1900, 'Past the floor.', 100, 0, last8);
  flat := (j->>'id')::bigint;
  assert (j->>'depth')::int = 8 and (j->>'parent')::bigint = ids[8] and (j->>'root')::bigint = ids[1] and j->>'replying_to' = 'Pericles',
    'a reply to a comment at depth 8 goes beside it, at depth 8, replying to its writer: ' || j::text;
  assert (select reply_to = last8 and parent_id = ids[8] and depth = 8 from public.chronia_comments where id = flat), 'and is stored so';
  flat2 := t.post(34, 'Corinth', 'Past it again.', flat);
  assert (select depth = 8 and parent_id = ids[8] and reply_to = flat from public.chronia_comments where id = flat2), 'and a reply to that one too';
  j := public.chronia_thread_of(flat2, null, 400);
  assert (j->'comments'->-1->>'replying_to') = 'Socrates' and (j->'comments'->-2->>'replying_to') = 'Pericles',
    'the thread says whom a reply at the floor is replying to: ' || (j->'comments'->-1)::text;
  assert (j->'comments'->1->'replying_to') = 'null', 'and says nothing for an ordinary reply';
  begin
    insert into public.chronia_comments (user_id, polity, at, at_num, body, parent_id, root_id, depth)
    values (t.u(31), 'Corinth', '1', 1, 'Too deep', last8, ids[1], 9);
    assert false, 'a depth of 9 is refused by the table';
  exception when check_violation then null;
  end;
end $$;

do $$
declare top bigint; j jsonb; n int;
begin
  -- Replies share the day's cap of comments.
  top := t.post(35, 'Argos', 'Capped.');
  insert into public.chronia_comments (user_id, polity, at, at_num, body) select t.u(35), 'Argos', '1', 1, 'x' from generate_series(1, 98);
  j := public.chronia_comment_send(t.u(35), 'Argos', '1', 1, 'the 100th, a reply', 100, 0, top);
  assert j ? 'id' and (j->>'left')::int = 0, 'the 100th comment of the day may be a reply: ' || j::text;
  j := public.chronia_comment_send(t.u(35), 'Argos', '1', 1, 'the 101st, a reply', 100, 0, top);
  assert j->>'error' = 'limit', 'the 101st, a reply, is refused: ' || j::text;
  delete from public.chronia_comments where user_id = t.u(35) and polity = 'Argos';
  j := public.chronia_comment_send(t.u(35), 'Argos', '1', 1, 'fast', 100, 10, null);
  j := public.chronia_comment_send(t.u(35), 'Argos', '1', 1, 'too fast', 100, 10, (j->>'id')::bigint);
  assert j->>'error' = 'fast', 'a reply waits the same gap after a comment: ' || j::text;
  delete from public.chronia_comments where user_id = t.u(35) and polity = 'Argos';
end $$;

-- ---------------------------------------------------------------- the card's list and the thread

do $$
declare a bigint; b bigint; c bigint; ra bigint; rb bigint; rr bigint; j jsonb; x jsonb;
begin
  a := t.post(31, 'Thebes', 'First top.');
  b := t.post(32, 'Thebes', 'Second top.');
  c := t.post(33, 'Thebes', 'Third top.');
  ra := t.post(34, 'Thebes', 'A reply to the first.', a);
  rr := t.post(35, 'Thebes', 'A reply to the reply.', ra);
  rb := t.post(31, 'Thebes', 'A reply to the second.', b);
  j := public.chronia_thread(array['Thebes'], 'new', null, 0, 20, t.u(31), false);
  assert t.ids(j) = array[c, b, a] and (j->>'total')::int = 3, 'the card lists top comments only, newest first: ' || j::text;
  x := j->'comments'->2;
  assert (x->>'replies')::int = 2 and (x->>'votes')::int = 0 and x->'parent' = 'null' and (x->>'depth')::int = 0
         and x->'voted' = 'false' and (x->>'mine')::boolean, 'each with its count of replies at any depth, its upvotes, and mine: ' || x::text;
  assert (j->'comments'->0->>'replies')::int = 0, 'a top comment with no replies says 0';
  -- Top: by upvotes, then newest.
  perform public.chronia_vote(t.u(34), b, true, 500);
  perform public.chronia_vote(t.u(35), b, true, 500);
  perform public.chronia_vote(t.u(34), a, true, 500);
  j := public.chronia_thread(array['Thebes'], 'top', null, 0, 20, t.u(34), false);
  assert t.ids(j) = array[b, a, c], 'Top orders by upvotes, then newest: ' || j::text;
  assert (j->'comments'->0->>'votes')::int = 2 and (j->'comments'->0->>'voted')::boolean, 'with the count and the reader''s own vote';
  j := public.chronia_thread(array['Thebes'], 'top', null, 1, 1, null, false);
  assert t.ids(j) = array[a] and (j->>'more')::boolean and (j->>'total')::int = 3, 'Top pages like the others';
  -- The thread window: the top and every reply, oldest first, from the top's id or a reply's.
  j := public.chronia_thread_of(rr, t.u(35), 400);
  assert t.ids(j) = array[a, ra, rr] and (j->>'root')::bigint = a and not (j->>'more')::boolean,
    'a thread is its top comment and every reply under it, in order of sending, from any of its ids: ' || j::text;
  assert (j->'comments'->2->>'mine')::boolean and (j->'comments'->2->>'parent')::bigint = ra and (j->'comments'->2->>'root')::bigint = a,
    'each with its parent, root, and mine';
  j := public.chronia_thread_of(a, null, 2);
  assert t.ids(j) = array[a, ra] and (j->>'more')::boolean, 'a thread past its limit says there is more';
  assert public.chronia_thread_of(99999999, null, 400)->>'error' = 'missing', 'a thread of nothing is missing';
end $$;

do $$
declare a bigint; ra bigint; rr bigint; lone bigint; j jsonb;
begin
  a := t.post(31, 'Megara', 'A top to hide.');
  ra := t.post(32, 'Megara', 'A reply under it.', a);
  rr := t.post(33, 'Megara', 'A reply to hide too.', ra);
  lone := t.post(34, 'Megara', 'A top with no replies.');
  update public.chronia_comments set state = 'hidden' where id in (a, lone);
  j := public.chronia_thread(array['Megara'], 'new', null, 0, 20, null, false);
  assert t.ids(j) = array[a], 'a hidden top comment with live replies is listed as a placeholder; one with none is left out: ' || j::text;
  assert j->'comments'->0->>'deleted' = 'true' and j->'comments'->0->>'hidden' = 'true' and j->'comments'->0->'username' = 'null'
         and j->'comments'->0->>'text' = '' and (j->'comments'->0->>'votes')::int = 0 and (j->'comments'->0->>'replies')::int = 2,
    'the placeholder has no name or text, says hidden, and counts its replies: ' || j::text;
  update public.chronia_comments set state = 'removed' where id = rr;
  j := public.chronia_thread_of(a, null, 400);
  assert t.ids(j) = array[a, ra], 'a removed reply with no replies is left out of the thread: ' || j::text;
  update public.chronia_comments set state = 'hidden' where id = ra;
  assert public.chronia_thread_of(a, null, 400)->>'error' = 'missing', 'a thread with nothing shown is missing';
  assert (public.chronia_thread(array['Megara'], 'new', null, 0, 20, null, false)->>'total')::int = 0, 'and leaves the card';
  update public.chronia_comments set state = 'live' where id = rr;
  j := public.chronia_thread_of(rr, null, 400);
  assert t.ids(j) = array[a, ra, rr] and j->'comments'->1->>'hidden' = 'true' and j->'comments'->2->>'text' = 'A reply to hide too.',
    'a hidden comment with a live reply under it shows as a placeholder: ' || j::text;
  perform public.chronia_block(t.u(33), true);
  assert public.chronia_thread_of(a, null, 400)->>'error' = 'missing', 'a blocked account''s replies leave the thread';
  perform public.chronia_block(t.u(33), false);
end $$;

-- ---------------------------------------------------------------- deleting

do $$
declare a bigint; ra bigint; rr bigint; j jsonb;
begin
  a := t.post(31, 'Delos', 'Mine, with replies.');
  ra := t.post(32, 'Delos', 'A reply.', a);
  rr := t.post(31, 'Delos', 'My reply to it.', ra);
  perform public.chronia_vote(t.u(33), a, true, 500);
  perform public.chronia_flag_add(t.u(34), a, null, 20, 3);
  j := public.chronia_comment_delete(t.u(32), a);
  assert j->>'error' = 'missing', 'another''s comment can''t be deleted';
  j := public.chronia_comment_delete(t.u(31), a);
  assert (j->>'ok')::boolean and (j->>'soft')::boolean, 'deleting one''s comment that has replies is soft: ' || j::text;
  assert (select deleted and body = '' and user_id is null and votes = 0 and flags = 0 and state = 'live' from public.chronia_comments where id = a),
    'it keeps its place, without its text, its account, its upvotes, or its reports';
  assert not exists (select 1 from public.chronia_votes where comment_id = a) and not exists (select 1 from public.chronia_flags where comment_id = a),
    'its upvotes and reports are erased';
  j := public.chronia_thread_of(ra, null, 400);
  assert t.ids(j) = array[a, ra, rr] and j->'comments'->0->>'deleted' = 'true' and not (j->'comments'->0 ? 'hidden'),
    'the thread shows it as a deleted comment over its replies: ' || j::text;
  assert public.chronia_vote(t.u(33), a, true, 500)->>'error' = 'gone', 'a deleted comment can''t be voted on';
  assert public.chronia_comment_send(t.u(33), 'Delos', '1', 1, 'x', 100, 0, a)->>'error' = 'gone', 'or replied to';
  j := public.chronia_comment_delete(t.u(31), rr);
  assert (j->>'ok')::boolean and not (j->>'soft')::boolean, 'a reply with no replies is erased';
  assert not exists (select 1 from public.chronia_comments where id = rr), 'and gone';
  j := public.chronia_comment_delete(t.u(32), ra);
  assert not (j->>'soft')::boolean, 'the last reply under a deleted comment is erased';
  assert not exists (select 1 from public.chronia_comments where id in (a, ra)), 'and the deleted comment with it';
end $$;

do $$
declare a bigint; ra bigint; rb bigint; rr bigint;
begin
  -- Up the thread: a placeholder over a placeholder goes when the last reply under both goes.
  a := t.post(31, 'Naxos', 'Top.');
  ra := t.post(32, 'Naxos', 'Middle.', a);
  rr := t.post(33, 'Naxos', 'Bottom.', ra);
  rb := t.post(34, 'Naxos', 'Beside.', a);
  perform public.chronia_comment_delete(t.u(31), a);
  perform public.chronia_comment_delete(t.u(32), ra);
  assert (select count(*) from public.chronia_comments where id in (a, ra) and deleted) = 2, 'two placeholders, one over the other';
  perform public.chronia_comment_delete(t.u(33), rr);
  assert not exists (select 1 from public.chronia_comments where id = ra), 'the middle one goes with the last reply under it';
  assert exists (select 1 from public.chronia_comments where id = a), 'the top stays, with a reply still under it';
  perform public.chronia_comment_delete(t.u(34), rb);
  assert not exists (select 1 from public.chronia_comments where id = a), 'and goes with its last';
end $$;

-- ---------------------------------------------------------------- upvotes

do $$
declare a bigint; mine bigint; j jsonb;
begin
  a := t.post(31, 'Samos', 'Vote for me.');
  mine := t.post(32, 'Samos', 'My own.');
  j := public.chronia_vote(t.u(32), a, true, 500);
  assert (j->>'ok')::boolean and (j->>'votes')::int = 1 and (j->>'voted')::boolean, 'an upvote counts: ' || j::text;
  j := public.chronia_vote(t.u(32), a, true, 500);
  assert (j->>'votes')::int = 1 and (j->>'voted')::boolean, 'a second upvote by one account changes nothing: ' || j::text;
  j := public.chronia_vote(t.u(33), a, true, 500);
  assert (j->>'votes')::int = 2, 'another account''s counts';
  j := public.chronia_vote(t.u(32), a, false, 500);
  assert (j->>'votes')::int = 1 and not (j->>'voted')::boolean, 'an upvote can be taken back: ' || j::text;
  assert (select votes from public.chronia_comments where id = a) = 1, 'and the stored count follows';
  assert public.chronia_vote(t.u(32), mine, true, 500)->>'error' = 'own', 'one''s own comment can''t be upvoted';
  assert public.chronia_vote(t.u(32), 99999999, true, 500)->>'error' = 'gone', 'nor a comment that doesn''t exist';
  assert public.chronia_vote(t.u(59), a, true, 500)->>'error' = 'profile', 'an account with no profile can''t vote';
  update public.chronia_comments set state = 'hidden' where id = a;
  assert public.chronia_vote(t.u(34), a, true, 500)->>'error' = 'gone', 'nor a hidden comment';
  update public.chronia_comments set state = 'removed' where id = a;
  assert public.chronia_vote(t.u(34), a, true, 500)->>'error' = 'gone', 'nor a removed one';
  update public.chronia_comments set state = 'live' where id = a;
  perform public.chronia_block(t.u(34), true);
  assert public.chronia_vote(t.u(34), a, true, 500)->>'error' = 'blocked', 'a blocked account can''t vote';
  perform public.chronia_block(t.u(34), false);
end $$;

do $$
declare a bigint; b bigint; j jsonb;
begin
  a := t.post(31, 'Chios', 'One.');
  b := t.post(31, 'Chios', 'Two.');
  update public.chronia_profiles set vote_count = 0, vote_day = null where user_id = t.u(35);
  j := public.chronia_vote(t.u(35), a, true, 3);
  j := public.chronia_vote(t.u(35), a, false, 3);
  j := public.chronia_vote(t.u(35), a, false, 3);
  assert (select vote_count from public.chronia_profiles where user_id = t.u(35)) = 2, 'a vote and its taking back count one each; a repeat counts nothing';
  j := public.chronia_vote(t.u(35), b, true, 3);
  assert (j->>'votes')::int = 1, 'the third change of the day passes';
  j := public.chronia_vote(t.u(35), a, true, 3);
  assert j->>'error' = 'limit', 'the fourth is past the cap: ' || j::text;
  j := public.chronia_vote(t.u(35), b, true, 3);
  assert (j->>'ok')::boolean and (j->>'votes')::int = 1, 'a vote already given is still answered past the cap';
  update public.chronia_profiles set vote_day = vote_day - 1 where user_id = t.u(35);
  assert (public.chronia_vote(t.u(35), a, true, 3)->>'ok')::boolean, 'the cap is for one day';
end $$;

-- ---------------------------------------------------------------- the account's own comments

do $$
declare a bigint; r bigint; h bigint; j jsonb;
begin
  delete from public.chronia_comments where user_id = t.u(36);
  perform public.chronia_profile_save(t.u(36), 'Hecataeus', 'hecataeus', null, true, 30);
  a := t.post(31, 'Halicarnassus', 'Someone else''s.');
  h := t.post(36, 'Halicarnassus', 'Mine, hidden.');
  r := t.post(36, 'Halicarnassus', 'My reply.', a);
  update public.chronia_comments set state = 'hidden', sent_at = sent_at - interval '1 minute' where id = h;
  perform public.chronia_vote(t.u(32), r, true, 500);
  j := public.chronia_mine(t.u(36), 0, 20);
  assert t.ids(j) = array[r, h] and not (j->>'more')::boolean, 'one''s own comments, newest first: ' || j::text;
  assert j->'comments'->0->>'replying_to' = 'Pericles' and (j->'comments'->0->>'parent')::bigint = a and (j->'comments'->0->>'votes')::int = 1
         and j->'comments'->0->>'polity' = 'Halicarnassus' and j->'comments'->0->>'at' = '1900' and j->'comments'->0->>'state' = 'live',
    'a reply says whom it replies to, with its name, date, state, and upvotes: ' || (j->'comments'->0)::text;
  assert j->'comments'->1->>'state' = 'hidden' and j->'comments'->1->>'text' = 'Mine, hidden.', 'a hidden one is listed with its text and state';
  j := public.chronia_mine(t.u(36), 1, 1);
  assert t.ids(j) = array[h] and not (j->>'more')::boolean, 'its pages';
  assert (public.chronia_mine(t.u(36), 0, 1)->>'more')::boolean, 'and more';
  assert jsonb_array_length(public.chronia_mine(t.u(60), 0, 20)->'comments') = 0, 'an account with none has none';
end $$;

-- ---------------------------------------------------------------- the team's queue

do $$
declare a bigint; r bigint; j jsonb; x jsonb;
begin
  a := t.post(31, 'Lesbos', 'Top.');
  r := t.post(32, 'Lesbos', 'A reported reply.', a);
  perform public.chronia_flag_add(t.u(33), r, null, 20, 3);
  j := public.chronia_queue();
  select e into x from jsonb_array_elements(j->'comments') e where (e->>'id')::bigint = r;
  assert (x->>'parent')::bigint = a and (x->>'root')::bigint = a, 'the queue gives a reply''s parent and root: ' || coalesce(x::text, 'none');
  update public.chronia_comments set state = 'removed' where id = a;
  perform public.chronia_comment_delete(t.u(31), a);
  assert not exists (select 1 from jsonb_array_elements(public.chronia_queue()->'comments') e where (e->>'id')::bigint = a),
    'a placeholder leaves the queue';
  assert not exists (select 1 from jsonb_array_elements(public.chronia_queue()->'comments') e where e = 'null'), 'and leaves no null in it';
end $$;

-- ---------------------------------------------------------------- erasing an account keeps others' replies

do $$
declare a bigint; mid bigint; lone bigint; own bigint; other bigint; ra bigint; rb bigint; v bigint; j jsonb;
begin
  -- Socrates (33) writes a top with others' replies, a reply in the middle of a chain, a top with none, and a reply
  -- to his own; he upvotes another's comment, which is upvoted by others too.
  perform public.chronia_profile_save(t.u(37), 'Plato', 'plato', null, true, 30);
  perform public.chronia_profile_save(t.u(38), 'Xanthippe', 'xanthippe', null, true, 30);
  a := t.post(33, 'Agora', 'Know thyself.');
  ra := t.post(37, 'Agora', 'Plato answers.', a);
  own := t.post(33, 'Agora', 'Socrates answers himself.', ra);
  other := t.post(38, 'Agora', 'Xanthippe top.');
  mid := t.post(33, 'Agora', 'Socrates in the middle.', other);
  rb := t.post(37, 'Agora', 'Plato under him.', mid);
  lone := t.post(33, 'Agora', 'Alone.');
  v := t.post(37, 'Agora', 'Upvoted.');
  perform public.chronia_vote(t.u(33), v, true, 500);
  perform public.chronia_vote(t.u(38), v, true, 500);
  perform public.chronia_vote(t.u(37), a, true, 500);
  perform public.chronia_flag_add(t.u(38), lone, null, 20, 3);
  j := public.chronia_account_erase(t.u(33));
  assert (j->>'ok')::boolean, 'the team''s erase: ' || j::text;
  assert not exists (select 1 from public.chronia_comments where user_id = t.u(33)), 'no comment keeps the erased account';
  assert not exists (select 1 from public.chronia_comments where body like '%Socrates%' or body in ('Know thyself.', 'Alone.')),
    'no erased comment keeps its text';
  assert not exists (select 1 from public.chronia_comments where id in (lone, own)), 'its comments with no replies are erased';
  assert (select deleted and user_id is null and body = '' and votes = 0 from public.chronia_comments where id = a)
         and (select deleted from public.chronia_comments where id = mid), 'its comments with replies are placeholders';
  assert (select count(*) from public.chronia_comments where id in (ra, rb)) = 2, 'others'' replies to it stay';
  assert t.ids(public.chronia_thread_of(ra, null, 400)) = array[a, ra], 'and still read as a thread under "Deleted comment"';
  assert t.ids(public.chronia_thread_of(rb, null, 400)) = array[other, mid, rb], 'in the middle of a chain too';
  assert (select votes from public.chronia_comments where id = v) = 1, 'its upvotes are taken from others'' counts';
  assert not exists (select 1 from public.chronia_votes where user_id = t.u(33) or comment_id = a), 'and erased';
end $$;

reset role;

-- Deleting the sign-in account in Supabase (here as a role with no right on the comments' tables) cascades through the
-- profile; the comments go the same way.
do $$
declare a bigint; r bigint; lone bigint; v bigint;
begin
  set local role service_role;
  a := t.post(34, 'Pnyx', 'Alcibiades speaks.');
  r := t.post(35, 'Pnyx', 'Cleon answers.', a);
  lone := t.post(34, 'Pnyx', 'Alcibiades alone.');
  v := t.post(35, 'Pnyx', 'Cleon, upvoted.');
  perform public.chronia_vote(t.u(34), v, true, 500);
  perform public.chronia_vote(t.u(31), v, true, 500);
  set local role auth_admin;
  delete from auth.users where id = t.u(34);
  reset role;
  assert not exists (select 1 from public.chronia_profiles where user_id = t.u(34)), 'deleting the sign-in account erases the profile';
  assert not exists (select 1 from public.chronia_comments where user_id = t.u(34) or body like 'Alcibiades%'), 'and its comments'' text';
  assert not exists (select 1 from public.chronia_comments where id = lone), 'its comment with no replies is erased';
  assert (select deleted and user_id is null from public.chronia_comments where id = a), 'its comment with a reply is a placeholder';
  assert exists (select 1 from public.chronia_comments where id = r and body = 'Cleon answers.'), 'the reply to it stays';
  assert (select votes from public.chronia_comments where id = v) = 1, 'its upvote is taken from the count';
end $$;

-- Two votes at once for one account can't both pass the day's cap.
set role service_role;
do $$
begin
  perform t.post(31, 'Rhodes', 'A.');
  perform t.post(31, 'Rhodes', 'B.');
end $$;
reset role;
update public.chronia_profiles set vote_count = 0, vote_day = null where user_id = t.u(32);

do $$
declare
  conn text := format('host=%s port=%s dbname=postgres user=postgres',
                      current_setting('unix_socket_directories'), current_setting('port'));
  a bigint := (select id from public.chronia_comments where polity = 'Rhodes' and body = 'A.');
  b bigint := (select id from public.chronia_comments where polity = 'Rhodes' and body = 'B.');
  r jsonb;
begin
  perform t.dblink_connect('a', conn);
  perform t.dblink_connect('b', conn);
  perform t.dblink_exec('a', 'begin; set local role service_role');
  perform * from t.dblink('a', format('select public.chronia_vote(%L, %s, true, 1)', t.u(32), a)) as x(j jsonb);
  perform t.dblink_exec('b', 'set role service_role');
  perform t.dblink_send_query('b', format('select public.chronia_vote(%L, %s, true, 1)', t.u(32), b));
  perform pg_sleep(0.3);
  assert t.dblink_is_busy('b') = 1, 'a second vote waits for the first one''s lock';
  perform t.dblink_exec('a', 'commit');
  select j into r from t.dblink_get_result('b') as x(j jsonb);
  perform * from t.dblink_get_result('b') as x(j jsonb);
  assert r->>'error' = 'limit', 'of two votes at once past the cap, only one lands: ' || coalesce(r::text, 'null');
  perform t.dblink_disconnect('a');
  perform t.dblink_disconnect('b');
end $$;
