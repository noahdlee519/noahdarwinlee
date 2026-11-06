-- The site's own tables (the game's daily scores, its events, and the profiles) gave `anon` and `authenticated`
-- the TRUNCATE, REFERENCES, and TRIGGER privileges, Supabase's old defaults. The REST API can't use them, and
-- nothing on the site needs them, so they are taken back; row-level security doesn't govern TRUNCATE.
-- Found in CHRONIA's security audit of 6 November 2026. Safe to run twice.
revoke truncate, references, trigger on public.daily_scores, public.events, public.profiles from anon, authenticated;
