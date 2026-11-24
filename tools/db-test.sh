#!/usr/bin/env bash
# Tests CHRONIA's comments migration on a throwaway PostgreSQL 16 cluster, never on the live project.
#
# Starts a cluster in a temporary directory, listening only on a socket there; makes Supabase's roles and
# stand-ins for auth.users and storage.buckets, with Supabase's default grants to anon and authenticated
# (so the migration's revokes are put to the test); runs the migration twice; then runs the tests. Prints
# PASS or FAIL, and always stops and removes the cluster.
#
# Usage, from the repository's root:  tools/db-test.sh
# Exit status 0 only on a pass. As root it runs the cluster as the `postgres` user (initdb refuses root).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/202611240700_chronia_comments.sql"
TESTS="$ROOT/supabase/tests/chronia_comments.sql"
BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
PORT=54329

for f in "$MIGRATION" "$TESTS" "$BIN/initdb" "$BIN/pg_ctl" "$BIN/psql"; do
  [ -e "$f" ] || { echo "FAIL: missing $f"; exit 1; }
done

# Who runs the cluster: the current user, or an unprivileged one when we are root.
if [ "$(id -u)" = 0 ]; then
  if id postgres >/dev/null 2>&1; then OSUSER=postgres; else OSUSER=nobody; fi
  as_pg() { runuser -u "$OSUSER" -- "$@"; }
else
  OSUSER="$(id -un)"
  as_pg() { "$@"; }
fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/chronia-db-test.XXXXXX")"
DATA="$TMP/data"
[ "$(id -u)" = 0 ] && chown "$OSUSER" "$TMP"
chmod 700 "$TMP"

cleanup() {
  as_pg "$BIN/pg_ctl" -D "$DATA" -m immediate -w stop >/dev/null 2>&1
  rm -rf "$TMP"
}
trap cleanup EXIT

fail() { echo "FAIL: $1"; [ -s "$TMP/log" ] && sed 's/^/  /' "$TMP/log"; exit 1; }

as_pg "$BIN/initdb" -D "$DATA" -U postgres -A trust -E UTF8 --no-locale >"$TMP/log" 2>&1 || fail "initdb"
as_pg "$BIN/pg_ctl" -D "$DATA" -w -l "$DATA/server.log" \
  -o "-c listen_addresses='' -c unix_socket_directories='$TMP' -p $PORT -c fsync=off -c timezone=UTC" \
  start >"$TMP/log" 2>&1 || fail "the server did not start"

# Files are read by this shell and handed to psql on its input, so the cluster's user needn't reach them.
sql() {
  PGOPTIONS='-c client_min_messages=warning' \
    as_pg "$BIN/psql" -X -q -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -f - >"$TMP/log" 2>&1
}

sql <<'SQL' || fail "the stand-ins"
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
-- Supabase's defaults: what the postgres role makes in public is open to the page's roles unless revoked.
-- service_role gets no table rights by default, as on the live project since November 2026.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create schema auth;
create table auth.users (id uuid primary key);
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
SQL

sql <"$MIGRATION" || fail "the migration, first run"
sql <"$MIGRATION" || fail "the migration, second run"
sql <"$TESTS" || fail "the tests"

echo "PASS: chronia_comments (migration run twice, $(grep -c '^do \$\$' "$TESTS") test blocks)"
exit 0
