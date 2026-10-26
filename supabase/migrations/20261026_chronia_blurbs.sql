create table if not exists public.chronia_blurbs (
  key text primary key,
  kind text not null check (kind in ('state', 'city')),
  subject text not null,
  period text not null,
  text text not null,
  model text not null,
  created_at timestamptz not null default now()
);
alter table public.chronia_blurbs enable row level security;
revoke all on public.chronia_blurbs from anon, authenticated;

create table if not exists public.chronia_blurb_usage (
  day date not null,
  who text not null,
  n integer not null default 0,
  primary key (day, who)
);
alter table public.chronia_blurb_usage enable row level security;
revoke all on public.chronia_blurb_usage from anon, authenticated;

create or replace function public.chronia_blurb_take(p_who text, p_all_cap integer, p_who_cap integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  d date := (now() at time zone 'utc')::date;
  total integer;
  mine integer;
begin
  insert into public.chronia_blurb_usage (day, who, n) values (d, '*', 0) on conflict do nothing;
  if found then
    delete from public.chronia_blurb_usage where day < d;
  end if;
  select n into total from public.chronia_blurb_usage where day = d and who = '*' for update;
  if total >= p_all_cap then
    return 'cap';
  end if;
  if p_who <> '' then
    select n into mine from public.chronia_blurb_usage where day = d and who = p_who;
    if coalesce(mine, 0) >= p_who_cap then
      return 'limit';
    end if;
    insert into public.chronia_blurb_usage (day, who, n) values (d, p_who, 1)
      on conflict (day, who) do update set n = public.chronia_blurb_usage.n + 1;
  end if;
  update public.chronia_blurb_usage set n = n + 1 where day = d and who = '*';
  return 'ok';
end;
$$;

create or replace function public.chronia_blurb_give_back(p_who text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.chronia_blurb_usage set n = greatest(n - 1, 0)
  where day = (now() at time zone 'utc')::date and who in ('*', p_who);
$$;

create or replace function public.chronia_blurb_save(p_key text, p_kind text, p_subject text, p_period text, p_text text, p_model text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  kept text;
begin
  insert into public.chronia_blurbs (key, kind, subject, period, text, model)
    values (p_key, p_kind, p_subject, p_period, p_text, p_model)
    on conflict (key) do nothing;
  select b.text into kept from public.chronia_blurbs b where b.key = p_key;
  return kept;
end;
$$;

revoke all on function public.chronia_blurb_take(text, integer, integer) from public, anon, authenticated;
revoke all on function public.chronia_blurb_give_back(text) from public, anon, authenticated;
revoke all on function public.chronia_blurb_save(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.chronia_blurb_take(text, integer, integer) to service_role;
grant execute on function public.chronia_blurb_give_back(text) to service_role;
grant execute on function public.chronia_blurb_save(text, text, text, text, text, text) to service_role;
grant select on public.chronia_blurbs to service_role;
