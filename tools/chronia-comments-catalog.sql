-- A fingerprint of what the comments migrations make (functions by the md5 of their source, columns, constraints,
-- indexes, the triggers, row-level security, function grants, and the buckets), one line for each kind. Run it on a
-- local build of supabase/migrations/202611240700_chronia_comments.sql and 202611250600_chronia_replies_votes.sql
-- and on the live project: every line should match, apart from table grants, where the live project gives
-- service_role more by default.
with t(n) as (values ('chronia_profiles'), ('chronia_comments'), ('chronia_flags'), ('chronia_avatar_trash'), ('chronia_votes')),
rows(kind, k, v) as (
  select 'fn', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', md5(p.prosrc) || ':' || p.prosecdef || ':' || coalesce(array_to_string(p.proconfig, ','), '') || ':' || pg_get_function_result(p.oid)
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname ~ '^chronia_(avatar|comment|profile|flag|account|thread|queue|me|mine|vote|block)'
  union all select 'col', c.table_name || '.' || c.column_name, c.data_type || ':' || c.is_nullable || ':' || coalesce(c.column_default, '') || ':' || coalesce(c.identity_generation, '') from information_schema.columns c where c.table_schema = 'public' and c.table_name in (select n from t)
  union all select 'con', (select relname from pg_class where oid = conrelid) || '.' || conname, pg_get_constraintdef(oid) from pg_constraint where conrelid in (select ('public.' || n)::regclass from t)
  union all select 'idx', indexname, indexdef from pg_indexes where schemaname = 'public' and tablename in (select n from t)
  union all select 'trg', tgname, pg_get_triggerdef(oid) from pg_trigger where not tgisinternal and tgrelid in (select ('public.' || n)::regclass from t)
  union all select 'rls', relname, relrowsecurity::text || ':' || (select count(*) from pg_policy where polrelid = pg_class.oid) from pg_class where oid in (select ('public.' || n)::regclass from t)
  union all select 'tgrant', g.table_name || ':' || g.grantee, string_agg(g.privilege_type, ',' order by g.privilege_type) from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name in (select n from t) and g.grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC') group by g.table_name, g.grantee
  union all select 'fgrant', r.routine_name || ':' || r.grantee, count(*)::text from information_schema.routine_privileges r where r.routine_schema = 'public' and r.routine_name ~ '^chronia_(avatar|comment|profile|flag|account|thread|queue|me|mine|vote|block)' and r.grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC') group by r.routine_name, r.grantee
  union all select 'bucket', id, public::text || ':' || file_size_limit || ':' || array_to_string(allowed_mime_types, ',') from storage.buckets where id like 'chronia-avatars%'
)
select kind, count(*) as n, md5(string_agg(k || '=' || v, E'\n' order by k)) as sum from rows group by kind order by kind;
