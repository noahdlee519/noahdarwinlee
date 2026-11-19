-- CHRONIA Premium: one payment of $5 through Stripe frees an account of the page's advertisements for good and doubles
-- its daily notes. One row per account that has paid; the edge function chronia-premium writes it from Stripe's
-- webhook and reads it, and chronia-blurb reads it, both with the project's secret key. Nothing here is open to the
-- page itself. Safe to run twice.
create table if not exists public.chronia_premium (
  user_id uuid primary key references auth.users (id) on delete cascade,
  since timestamptz not null default now(),
  stripe_session text not null default '',
  stripe_payment text not null default '',
  amount integer not null default 0,
  currency text not null default ''
);
create index if not exists chronia_premium_payment on public.chronia_premium (stripe_payment);
alter table public.chronia_premium enable row level security;
revoke all on public.chronia_premium from public, anon, authenticated;
grant select, insert, update, delete on public.chronia_premium to service_role;
