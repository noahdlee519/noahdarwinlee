-- CHRONIA's developer tools: Noah's edits to the map, each for a span of dates (see
-- docs/superpowers/specs/2026-11-05-chronia-dev-tools-design.md).
--
-- The page reads them through the edge function chronia-edits (anyone may list them); only that
-- function writes them, with the project's secret key, after checking Noah's password
-- (CHRONIA_REVIEW_PASSWORD). Safe to run twice: everything is created only if it is missing.

create table if not exists public.chronia_edits (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('country-colour', 'country-name', 'label', 'city-size', 'city-name', 'city-hide')),
  target text not null check (char_length(target) between 1 and 200),
  date_from text not null check (date_from ~ '^-?\d{1,4}(-\d{2}(-\d{2})?)?$'),
  date_to text not null check (date_to ~ '^-?\d{1,4}(-\d{2}(-\d{2})?)?$'),
  value jsonb not null default '{}'::jsonb check (octet_length(value::text) < 2000),
  note text not null default '' check (char_length(note) < 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chronia_edits_target on public.chronia_edits (target);
alter table public.chronia_edits enable row level security;
revoke all on public.chronia_edits from anon, authenticated;
