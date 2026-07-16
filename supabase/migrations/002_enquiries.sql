-- ============================================================
-- HerCoach Jess — Enquiries
-- Backs the public enquiry form (/enquire → /api/enquiry).
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
-- Idempotent: safe to run against a project where the table already exists.
-- ============================================================

create table if not exists public.enquiries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  first_name   text not null,
  last_name    text,
  email        text not null,
  phone        text,
  goal         text,
  about        text,
  hear_from    text,
  best_contact text,
  status       text not null default 'new'
                 check (status in ('new','contacted','converted','closed')),
  contacted_at timestamptz,
  -- Date/time of the booked free discovery call (set from the dashboard).
  discovery_call_at timestamptz,
  coach_notes  text,
  -- Links an enquiry to an existing client when the email matches.
  client_id    uuid references public.clients(id) on delete set null
);

create index if not exists enquiries_created_at_idx on public.enquiries (created_at desc);
create index if not exists enquiries_email_idx on public.enquiries (lower(email));

-- Row Level Security: inserts/reads happen server-side via the service-role
-- key (which bypasses RLS), so RLS stays on with no public policies — the
-- anon key cannot read or write enquiries directly from the browser.
alter table public.enquiries enable row level security;
