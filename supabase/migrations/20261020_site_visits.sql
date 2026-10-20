create table if not exists public.site_visits (
  day date primary key,
  n integer not null default 0
);
alter table public.site_visits enable row level security;
revoke all on public.site_visits from anon, authenticated;

create or replace function public.count_visit()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.site_visits (day, n)
    values ((now() at time zone 'America/New_York')::date, 1)
    on conflict (day) do update set n = public.site_visits.n + 1;
$$;

revoke all on function public.count_visit() from public;
grant execute on function public.count_visit() to anon, authenticated;
