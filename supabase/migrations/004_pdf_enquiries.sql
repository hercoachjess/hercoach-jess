-- ============================================================
-- HerCoach Jess — Guide / PDF purchase enquiries
-- Backs the public guide enquiry form (/guides → /api/pdf-enquiry) and its
-- own "Guide enquiries" section on the dashboard.
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
-- Idempotent: safe to run more than once.
-- ============================================================

create table if not exists public.pdf_enquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  phone       text,
  guide       text not null,          -- which PDF they want (from the guides list)
  message     text,
  status      text not null default 'new'
                check (status in ('new','contacted','sent','closed')),
  coach_notes text
);

create index if not exists pdf_enquiries_created_at_idx on public.pdf_enquiries (created_at desc);

-- RLS on; the anon key can't read/write directly. Inserts/reads go through the
-- service-role key server-side (same pattern as the coaching enquiries).
alter table public.pdf_enquiries enable row level security;
