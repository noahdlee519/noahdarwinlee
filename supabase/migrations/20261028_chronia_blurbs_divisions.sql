alter table public.chronia_blurbs drop constraint if exists chronia_blurbs_kind_check;
alter table public.chronia_blurbs add constraint chronia_blurbs_kind_check check (kind in ('state', 'city', 'division'));
