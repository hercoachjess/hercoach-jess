-- Client routine preference, drives day-by-day plan structuring around the
-- individual's real schedule (which days they train, rough meal timings) vs a
-- flexible approach. Captured at onboarding, editable on the client file, and
-- refreshed via the weekly check-in.
alter table public.clients
  add column if not exists routine_type text,
  add column if not exists routine_notes text;

comment on column public.clients.routine_type is 'Client routine preference: fixed | flexible | null. Drives day-by-day plan structuring.';
comment on column public.clients.routine_notes is 'Free-text description of the client''s typical day: when they train and roughly when they eat.';
