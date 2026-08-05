-- ============================================================
-- HerCoach Jess — Saveable per-check-in coach feedback
-- Backs the "Feedback to client" flow on the Check-ins tab: generate feedback
-- for a check-in (auto-comparing to the previous week), edit and save it as
-- you go, amend it with AI, and export it as a branded PDF. The feedback TEXT
-- is the source of truth; the PDF is regenerated on demand from it (cheaper
-- than storing PDF binaries, and always reflects the latest branding).
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
-- Idempotent: safe to run more than once.
-- ============================================================

alter table public.checkin_submissions
  add column if not exists coach_feedback text,          -- the editable feedback body
  add column if not exists coach_feedback_areas jsonb,   -- which areas were included when generated
  add column if not exists feedback_updated_at timestamptz;
