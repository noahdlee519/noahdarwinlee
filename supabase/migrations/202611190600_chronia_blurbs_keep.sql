-- CHRONIA's notes are kept for good (19 November 2026): chronia_blurb_save no longer deletes the notes nobody has
-- been shown for 30 days, as it did from 7 November 2026. A note is about 1 kB with its index (5,336 notes took
-- 5.6 MB on the day), so even a few hundred thousand fit the database, and a note once written is never paid for
-- again. last_seen is still kept, by chronia_blurb_get, should the notes ever need thinning. Safe to run twice.
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
revoke all on function public.chronia_blurb_save(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.chronia_blurb_save(text, text, text, text, text, text) to service_role;
