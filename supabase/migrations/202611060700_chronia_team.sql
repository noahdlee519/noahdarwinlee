-- CHRONIA's team by Google account, in place of the shared passwords (6 November 2026), and a report count
-- that can't be outrun.
--
-- chronia_team lists the accounts that may read the reports (`viewer`) and those that may also answer them
-- and edit the map (`reviewer`). The edge functions chronia-report and chronia-edits read it with the
-- project's secret key; the page never does. Add someone after they have signed in once on the atlas:
--
--   insert into public.chronia_team (user_id, role, note)
--   select id, 'viewer', 'fact checker' from auth.users where lower(email) = lower('someone@gmail.com');
--
-- chronia_report_send counts an account's reports today and adds the new one in one step, holding a lock on
-- the account meanwhile, so a burst of reports sent at once can't pass the day's cap. Safe to run twice.

create table if not exists public.chronia_team (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('viewer', 'reviewer')),
  note text not null default '' check (char_length(note) <= 200),
  added_at timestamptz not null default now()
);
alter table public.chronia_team enable row level security;
revoke all on public.chronia_team from anon, authenticated;
grant select on public.chronia_team to service_role;

create or replace function public.chronia_report_send(p_row jsonb, p_cap integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (p_row->>'user_id')::uuid;
  since timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  n integer;
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('chronia-report|' || uid::text, 0));
  select count(*) into n from public.chronia_reports where user_id = uid and created_at >= since;
  if n >= p_cap then
    return jsonb_build_object('id', null, 'sent', n);
  end if;
  insert into public.chronia_reports (user_id, email, reporter, lon, lat, zoom, place, date_from, date_to, at_time, layers, note)
  values (uid, p_row->>'email', p_row->>'reporter', (p_row->>'lon')::double precision, (p_row->>'lat')::double precision,
          (p_row->>'zoom')::real, p_row->>'place', p_row->>'date_from', p_row->>'date_to', p_row->>'at_time', p_row->>'layers', p_row->>'note')
  returning id into new_id;
  return jsonb_build_object('id', new_id, 'sent', n + 1);
end;
$$;
revoke all on function public.chronia_report_send(jsonb, integer) from public, anon, authenticated;
grant execute on function public.chronia_report_send(jsonb, integer) to service_role;
