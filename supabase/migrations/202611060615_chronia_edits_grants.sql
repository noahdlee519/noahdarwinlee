-- The chronia-edits function lists, saves, changes, and deletes edits as service_role, but on this project new
-- tables no longer give service_role its usual rights (as with chronia_reports), so every call failed with
-- "permission denied for table chronia_edits" and the page said "The edit could not be saved (store)". Safe to
-- run twice.
grant select, insert, update, delete on public.chronia_edits to service_role;
grant usage, select on sequence public.chronia_edits_id_seq to service_role;
