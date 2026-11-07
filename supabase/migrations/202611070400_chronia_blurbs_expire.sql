-- CHRONIA's notes expire when nobody has looked at them for 30 days (7 November 2026), so the cache keeps
-- what readers use and doesn't pile up. A note asked for again after that is written afresh (about 1/50 of a
-- cent).
--
-- last_seen is when a note was last shown, kept to the day: chronia_blurb_get, which the edge function now
-- uses to look a note up, moves it on at most once a day, so reading costs no more than one small write a
-- day for each note in use. chronia_blurb_save, after keeping a new note, deletes up to 200 notes unseen for
-- 30 days, so the sweep runs only while notes are being written, which is the only time the table grows.
-- Safe to run twice.

alter table public.chronia_blurbs add column if not exists last_seen timestamptz;
update public.chronia_blurbs set last_seen = created_at where last_seen is null;
alter table public.chronia_blurbs alter column last_seen set default now();
alter table public.chronia_blurbs alter column last_seen set not null;
create index if not exists chronia_blurbs_last_seen on public.chronia_blurbs (last_seen);

-- The first of the keys that has a note (the current key, then the older one without the neighbours).
create or replace function public.chronia_blurb_get(p_keys text[])
returns table (note text, note_model text, note_period text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text;
begin
  foreach k in array p_keys loop
    update public.chronia_blurbs b set last_seen = now()
      where b.key = k and b.last_seen < now() - interval '1 day';
    return query select b.text, b.model, b.period from public.chronia_blurbs b where b.key = k;
    if found then
      return;
    end if;
  end loop;
end;
$$;
revoke all on function public.chronia_blurb_get(text[]) from public, anon, authenticated;
grant execute on function public.chronia_blurb_get(text[]) to service_role;

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
  if found then
    delete from public.chronia_blurbs where key in (
      select b.key from public.chronia_blurbs b where b.last_seen < now() - interval '30 days' limit 200
    );
  end if;
  select b.text into kept from public.chronia_blurbs b where b.key = p_key;
  return kept;
end;
$$;
revoke all on function public.chronia_blurb_save(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.chronia_blurb_save(text, text, text, text, text, text) to service_role;
