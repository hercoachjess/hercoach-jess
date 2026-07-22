-- ============================================================
-- HerCoach Jess — Check-in weekly AI review
-- Stores the generated weekly review (snapshot, recommendations,
-- suggested macro targets, draft client message) on each check-in so it
-- persists between visits instead of being regenerated every time.
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
-- Idempotent: safe to run more than once.
-- ============================================================

alter table public.checkin_submissions
  add column if not exists ai_weekly_review jsonb;
