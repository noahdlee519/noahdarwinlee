-- The chronia-report function reads, sends, and closes reports as service_role, but on this project new
-- tables no longer give service_role its usual rights, so listing the reports failed with "permission
-- denied" (a 500 on the reports page) and sending one would too. Safe to run twice.
grant select, insert, update on public.chronia_reports to service_role;
grant usage, select on sequence public.chronia_reports_id_seq to service_role;
