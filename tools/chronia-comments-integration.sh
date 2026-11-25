#!/usr/bin/env bash
# Runs the edge function's real code against the real SQL on a throwaway local PostgreSQL 16 cluster (never the
# live project): tools/chronia-comments-integration.ts drives every action. Only sign-in, storage, and the picture
# check are stand-ins. Usage, from anywhere:  tools/chronia-comments-integration.sh   (needs root, psql 16, and deno)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; DENO="${DENO:-$(command -v deno || echo /home/claude/.npm-global/bin/deno)}"; BIN=/usr/lib/postgresql/16/bin; PORT=54331
TMP="$(mktemp -d /tmp/integ-db.XXXXXX)"; chown postgres "$TMP"; chmod 700 "$TMP"
as_pg() { runuser -u postgres -- "$@"; }
cleanup() { as_pg $BIN/pg_ctl -D "$TMP/data" -m immediate -w stop >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT
as_pg $BIN/initdb -D "$TMP/data" -U postgres -A trust -E UTF8 --no-locale >/dev/null 2>&1 || { echo initdb failed; exit 1; }
as_pg $BIN/pg_ctl -D "$TMP/data" -w -l "$TMP/data/server.log" -o "-c listen_addresses='' -c unix_socket_directories='$TMP' -p $PORT -c fsync=off -c timezone=UTC" start >/dev/null 2>&1 || { echo start failed; exit 1; }
sql() { as_pg $BIN/psql -X -q -h "$TMP" -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -f - ; }
sql <<'SQL' || exit 1
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create schema auth; create table auth.users (id uuid primary key);
create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table public.chronia_team (user_id uuid primary key, role text not null);
revoke all on public.chronia_team from anon, authenticated; grant select on public.chronia_team to service_role;
SQL
PGOPTIONS='-c client_min_messages=warning' sql < $ROOT/supabase/migrations/202611240700_chronia_comments.sql || exit 1
PGOPTIONS='-c client_min_messages=warning' sql < $ROOT/supabase/migrations/202611250600_chronia_replies_votes.sql || exit 1
PGSOCK="$TMP" PGPORT_T=$PORT "$DENO" run -A "$ROOT/tools/chronia-comments-integration.ts"
