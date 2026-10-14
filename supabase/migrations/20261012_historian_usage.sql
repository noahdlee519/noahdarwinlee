create table if not exists public.historian_usage (
  day date not null,
  who text not null,
  n integer not null default 0,
  primary key (day, who)
);
alter table public.historian_usage enable row level security;
revoke all on public.historian_usage from anon, authenticated;

create or replace function public.historian_take(p_who text, p_all_cap integer, p_who_cap integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  d date := (now() at time zone 'utc')::date;
  total integer;
  mine integer;
begin
  insert into public.historian_usage (day, who, n) values (d, '*', 0) on conflict do nothing;
  select n into total from public.historian_usage where day = d and who = '*' for update;
  select n into mine from public.historian_usage where day = d and who = p_who;
  if total >= p_all_cap or coalesce(mine, 0) >= p_who_cap then
    return false;
  end if;
  update public.historian_usage set n = n + 1 where day = d and who = '*';
  insert into public.historian_usage (day, who, n) values (d, p_who, 1)
    on conflict (day, who) do update set n = public.historian_usage.n + 1;
  return true;
end;
$$;

create or replace function public.historian_give_back(p_who text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.historian_usage set n = greatest(n - 1, 0)
  where day = (now() at time zone 'utc')::date and who in ('*', p_who);
$$;

revoke all on function public.historian_take(text, integer, integer) from public, anon, authenticated;
revoke all on function public.historian_give_back(text) from public, anon, authenticated;
grant execute on function public.historian_take(text, integer, integer) to service_role;
grant execute on function public.historian_give_back(text) to service_role;
