create or replace function public.historian_once(p_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.historian_usage (day, who, n)
    values ((now() at time zone 'utc')::date, 'once:' || p_key, 1)
    on conflict do nothing;
  return found;
end;
$$;

revoke all on function public.historian_once(text) from public, anon, authenticated;
grant execute on function public.historian_once(text) to service_role;
