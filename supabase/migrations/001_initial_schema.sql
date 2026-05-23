-- ============================================================
-- HerCoach Jess — Initial Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.clients (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  full_name          text not null,
  email              text not null,
  phone              text not null default '',
  status             text not null default 'active'
                       check (status in ('active','paused','archived')),
  date_of_birth      date,
  sex                text,
  height_cm          numeric,
  starting_weight_kg numeric,
  current_weight_kg  numeric,
  goal               text,
  primary_goal_kcal  int,
  protein_target_g   int,
  fat_target_g       int,
  carbs_target_g     int,
  hr_resting         int,
  hr_max             int,
  hr_zone2_low       int,
  hr_zone2_high      int,
  checkin_day        text,
  coach_notes        text
);

create table if not exists public.onboarding_submissions (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  created_at  timestamptz not null default now(),
  payload     jsonb not null,
  signed_name text not null default '',
  signed_date text not null default ''
);

create table if not exists public.checkin_submissions (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  created_at   timestamptz not null default now(),
  week_number  int,
  payload      jsonb not null
);

create table if not exists public.meal_plans (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  status       text not null default 'draft'
                 check (status in ('draft','saved','archived')),
  targets      jsonb not null default '{"kcal":2000,"protein_g":150,"fat_g":70,"carbs_g":200}',
  meals        jsonb not null default '[]',
  coach_notes  text,
  is_current   boolean not null default true
);

create table if not exists public.training_plans (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  status       text not null default 'draft'
                 check (status in ('draft','saved','archived')),
  level        text not null default 'beginner'
                 check (level in ('beginner','intermediate','advanced')),
  days_per_week int not null default 3,
  sessions     jsonb not null default '[]',
  coach_notes  text,
  is_current   boolean not null default true
);

create table if not exists public.plan_history (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null references public.clients(id) on delete cascade,
  created_at              timestamptz not null default now(),
  version                 text not null,
  note                    text not null default '',
  meal_plan_snapshot      jsonb,
  training_plan_snapshot  jsonb,
  pdf_url                 text,
  is_current              boolean not null default false
);

create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  created_at     timestamptz not null default now(),
  amount_gbp     numeric not null,
  due_date       date not null,
  paid_date      date,
  status         text not null default 'pending'
                   check (status in ('pending','paid','overdue','cancelled')),
  payment_method text,
  notes          text
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_onboarding_client   on public.onboarding_submissions(client_id);
create index if not exists idx_checkin_client       on public.checkin_submissions(client_id);
create index if not exists idx_checkin_created      on public.checkin_submissions(created_at desc);
create index if not exists idx_meal_plan_client     on public.meal_plans(client_id);
create index if not exists idx_training_plan_client on public.training_plans(client_id);
create index if not exists idx_plan_history_client  on public.plan_history(client_id);
create index if not exists idx_payments_client      on public.payments(client_id);
create index if not exists idx_payments_due_date    on public.payments(due_date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.clients              enable row level security;
alter table public.onboarding_submissions enable row level security;
alter table public.checkin_submissions  enable row level security;
alter table public.meal_plans           enable row level security;
alter table public.training_plans       enable row level security;
alter table public.plan_history         enable row level security;
alter table public.payments             enable row level security;

-- Public / anon: can only INSERT into form submission tables
-- (clients row is created by an API route using the service role)

create policy "anon_insert_onboarding"
  on public.onboarding_submissions
  for insert
  to anon
  with check (true);

create policy "anon_insert_checkin"
  on public.checkin_submissions
  for insert
  to anon
  with check (true);

-- Authenticated coach (single user): full access to all tables

create policy "coach_all_clients"
  on public.clients
  for all
  to authenticated
  using (true)
  with check (true);

create policy "coach_all_onboarding"
  on public.onboarding_submissions
  for all
  to authenticated
  using (true)
  with check (true);

create policy "coach_all_checkins"
  on public.checkin_submissions
  for all
  to authenticated
  using (true)
  with check (true);

create policy "coach_all_meal_plans"
  on public.meal_plans
  for all
  to authenticated
  using (true)
  with check (true);

create policy "coach_all_training_plans"
  on public.training_plans
  for all
  to authenticated
  using (true)
  with check (true);

create policy "coach_all_plan_history"
  on public.plan_history
  for all
  to authenticated
  using (true)
  with check (true);

create policy "coach_all_payments"
  on public.payments
  for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- STORAGE BUCKET (run separately if needed)
-- ============================================================
-- insert into storage.buckets (id, name, public)
--   values ('plan-pdfs', 'plan-pdfs', false)
--   on conflict do nothing;

-- ============================================================
-- SEED DATA (demo clients for immediate navigation)
-- ============================================================

-- Replace this email with Jess's actual Supabase auth user email
-- so the demo data appears immediately on first login.

insert into public.clients (
  id, full_name, email, phone, status,
  date_of_birth, sex, height_cm,
  starting_weight_kg, current_weight_kg,
  goal, primary_goal_kcal, protein_target_g, fat_target_g, carbs_target_g,
  checkin_day, coach_notes
) values
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Sophie Carter',
  'sophie.carter@example.com',
  '07700900001',
  'active',
  '1994-03-12',
  'Female',
  167,
  72.4, 69.8,
  'Fat loss & improved energy',
  1800, 140, 60, 160,
  'Monday',
  'Making great progress. Increase protein target next review.'
),
(
  'a1b2c3d4-0002-0002-0002-000000000002',
  'Emma Hughes',
  'emma.hughes@example.com',
  '07700900002',
  'active',
  '1988-07-25',
  'Female',
  162,
  65.0, 65.2,
  'Muscle gain & performance',
  2200, 170, 75, 220,
  'Wednesday',
  'Strong adherence. Consider progressive overload on weights.'
),
(
  'a1b2c3d4-0003-0003-0003-000000000003',
  'Rachel Green',
  'rachel.green@example.com',
  '07700900003',
  'paused',
  '1996-11-08',
  'Female',
  170,
  78.5, 77.1,
  'Sustainable lifestyle change',
  1950, 145, 65, 190,
  'Thursday',
  'On pause for holiday. Resume check-ins from 10 June.'
)
on conflict (id) do nothing;

insert into public.checkin_submissions (id, client_id, week_number, payload) values
(
  gen_random_uuid(),
  'a1b2c3d4-0001-0001-0001-000000000001',
  8,
  '{
    "name": "Sophie Carter",
    "email": "sophie.carter@example.com",
    "weight_kg": 69.8,
    "clothes_fit": "Slightly looser",
    "body_feel": "Good",
    "nutrition_adherence": "Mostly on track",
    "threw_off": "Friday work drinks — went over on snacks",
    "hunger": "Manageable",
    "cravings": "Chocolate in the evenings",
    "training_sessions": "3 sessions",
    "training_feel": "Good — solid sessions",
    "prs": "Added 2.5kg to lat pulldown",
    "discomfort": "",
    "sleep_quality": "Good — mostly solid",
    "stress_level": "Moderate",
    "energy": "Good",
    "water_intake": "About 1.5–2L",
    "biggest_win": "Meal prepped on Sunday — so much easier staying on track all week",
    "hardest_part": "Social dinner midweek, hard to stick to portions",
    "mood": "Positive",
    "questions_for_jess": "Should I add a fourth training day next week?"
  }'
),
(
  gen_random_uuid(),
  'a1b2c3d4-0002-0002-0002-000000000002',
  5,
  '{
    "name": "Emma Hughes",
    "email": "emma.hughes@example.com",
    "weight_kg": 65.2,
    "clothes_fit": "Same",
    "body_feel": "Amazing",
    "nutrition_adherence": "Nailed it",
    "threw_off": "",
    "hunger": "Manageable",
    "cravings": "",
    "training_sessions": "4 sessions",
    "training_feel": "Felt strong — smashed it",
    "prs": "Hit a new PB on deadlift",
    "discomfort": "",
    "sleep_quality": "Excellent — 7–9hrs",
    "stress_level": "Low — calm",
    "energy": "High — feeling great",
    "water_intake": "2L+ consistently",
    "biggest_win": "Deadlift PB — felt unstoppable",
    "hardest_part": "Late nights at work — hard to prioritise sleep one night",
    "mood": "Amazing",
    "questions_for_jess": "Really enjoying the programme — energy is excellent."
  }'
)
on conflict do nothing;

insert into public.payments (client_id, amount_gbp, due_date, paid_date, status, payment_method, notes) values
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  149.00,
  '2026-05-01',
  '2026-05-02',
  'paid',
  'Bank transfer',
  'Month 1 package'
),
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  149.00,
  '2026-06-01',
  null,
  'pending',
  null,
  'Month 2 package'
),
(
  'a1b2c3d4-0002-0002-0002-000000000002',
  199.00,
  '2026-04-15',
  '2026-04-16',
  'paid',
  'Bank transfer',
  '6-week performance package'
),
(
  'a1b2c3d4-0003-0003-0003-000000000003',
  149.00,
  '2026-04-01',
  null,
  'pending',
  null,
  'April — paused month partial'
)
on conflict do nothing;
