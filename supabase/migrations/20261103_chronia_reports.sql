-- CHRONIA's fact checkers' reports: a place, a stretch of time, and a note on what is wrong there.
--
-- The page never reads or writes these tables itself. The edge function chronia-report does, with the
-- project's secret key, after checking the team's shared password (CHRONIA_REPORT_PASSWORD) or Noah's
-- (CHRONIA_REVIEW_PASSWORD). Safe to run twice: everything is created only if it is missing.

create table if not exists public.chronia_reports (
  id bigint generated always as identity primary key,
  reporter text not null check (char_length(reporter) between 1 and 80),
  lon double precision not null check (lon between -180 and 180),
  lat double precision not null check (lat between -90 and 90),
  zoom real not null default 4 check (zoom > 0 and zoom < 1000),
  place text not null default '' check (char_length(place) <= 200),
  date_from text not null check (char_length(date_from) between 1 and 40),
  date_to text not null check (char_length(date_to) between 1 and 40),
  at_time text not null check (char_length(at_time) between 1 and 20),
  layers text not null default '' check (char_length(layers) <= 200),
  note text not null check (char_length(note) between 1 and 2000),
  status text not null default 'open' check (status in ('open', 'fixed', 'declined')),
  reply text not null default '' check (char_length(reply) <= 2000),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists chronia_reports_status on public.chronia_reports (status, created_at desc);
alter table public.chronia_reports enable row level security;
revoke all on public.chronia_reports from anon, authenticated;

-- Wrong passwords, counted per visitor (a salted hash of the address, new each day) and day, so the
-- passwords can't be guessed by trying many: after 20 wrong tries a visitor is shut out until the next day.
create table if not exists public.chronia_report_strikes (
  day date not null,
  who text not null,
  n integer not null default 0,
  primary key (day, who)
);
alter table public.chronia_report_strikes enable row level security;
revoke all on public.chronia_report_strikes from anon, authenticated;

create or replace function public.chronia_report_strike(p_who text, p_add boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  d date := (now() at time zone 'utc')::date;
  k integer;
begin
  delete from public.chronia_report_strikes where day < d - 1;
  if p_add then
    insert into public.chronia_report_strikes (day, who, n) values (d, p_who, 1)
      on conflict (day, who) do update set n = public.chronia_report_strikes.n + 1
      returning n into k;
    return k;
  end if;
  select n into k from public.chronia_report_strikes where day = d and who = p_who;
  return coalesce(k, 0);
end;
$$;
revoke all on function public.chronia_report_strike(text, boolean) from public, anon, authenticated;
grant execute on function public.chronia_report_strike(text, boolean) to service_role;
