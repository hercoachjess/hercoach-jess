# HerCoach Jess — Private Coaching Platform

A private client management platform for HerCoach Jess, an online nutrition and fitness coaching business. Built with Next.js 16, Supabase, and the Anthropic Claude API.

## Tech Stack

- **Next.js 16** (App Router) — frontend & backend API routes
- **Supabase** — Postgres database + Auth + Storage
- **Tailwind CSS v4** — styling
- **@react-pdf/renderer** — PDF generation
- **Anthropic Claude API** (`claude-sonnet-4-5`) — AI drafting
- **Recharts** — data visualisation

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get Supabase keys from: **Supabase Dashboard → Project Settings → API**
Get Anthropic key from: **console.anthropic.com**

---

## Database Setup

### 1. Run the migration

Open the **Supabase SQL Editor** (your project → SQL Editor → New query) and paste the full contents of:

```
supabase/migrations/001_initial_schema.sql
```

Click **Run**. This creates all tables, indexes, and RLS policies, and inserts three demo clients.

### 2. Create the plan-pdfs storage bucket

In **Supabase Dashboard → Storage → New bucket**:
- Name: `plan-pdfs`
- Public: **off** (private — links are generated via the API)

Or uncomment and run the two lines at the bottom of the migration file.

---

## Create the Coach Login (Jess's account)

In **Supabase Dashboard → Authentication → Users → Invite user** (or Add user):
- Enter Jess's email and a strong password
- This is the ONLY account. The dashboard will only ever be accessible to this user.

---

## Run Locally

```bash
cd hercoach-jess
npm install
cp .env.local.example .env.local
# Fill in .env.local with your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/dashboard`, which redirects to `/login` until you sign in.

---

## Deploy to Vercel

1. Push the `hercoach-jess` folder to a GitHub/GitLab repo
2. Import into [Vercel](https://vercel.com/new)
3. Add all environment variables from `.env.local` in the Vercel project settings
4. Change `NEXT_PUBLIC_APP_URL` to your Vercel production URL
5. Deploy

---

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/onboarding` | Public | Multi-step client onboarding form |
| `/checkin` | Public | Weekly check-in form |
| `/login` | Public | Coach sign-in |
| `/dashboard` | Coach only | Client list + stats |
| `/dashboard/client/[id]` | Coach only | Full client file (9 tabs) |

---

## Client Experience

Clients **never log in**. Jess shares two links:
1. **Onboarding**: `yoursite.com/onboarding` — completed once
2. **Check-in**: `yoursite.com/checkin` — submitted weekly

Both forms are unauthenticated, write-only.

---

## Dashboard — 9 Tabs

| Tab | What it does |
|-----|-------------|
| Overview | Weight stats, metrics, inline-editable targets |
| Check-ins | Expandable list of all weekly check-ins |
| Compare & Feedback | AI-drafted comparison summary (editable before sending) |
| Progress Graphs | Weight / training / wellbeing charts with PNG export |
| Meal Plan | AI-drafted or manually edited meal plan |
| Training Plan | AI-drafted or manually edited training programme |
| Plan History | Version-controlled snapshots with branded PDFs |
| Payments | Log and track payments |
| Onboarding File | Read-only view of original onboarding answers |

---

## AI Features

All AI generation is server-side via `/api/ai/*` routes. The Anthropic API key is **never** exposed to the browser.

Every AI output is a **draft** — Jess reviews and edits before anything is saved or sent to a client.

---

## PDF Generation

When Jess saves a plan to history, a combined meal + training PDF is generated server-side and uploaded to Supabase Storage. The PDF is branded with the HerCoach Jess identity (dark theme, serif/sans typography, macro targets, exercise tables).

Provide Jess with the download link or send directly from the plan history tab.

---

## Security & Compliance

- RLS enforced: public/anon can only INSERT into `onboarding_submissions` and `checkin_submissions`
- Authenticated coach can SELECT/UPDATE all rows
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never sent to the browser
- `ANTHROPIC_API_KEY` is server-side only — never sent to the browser
- Both public forms include a UK GDPR privacy notice footer
- Health data is stored in the EU Supabase region (verify your project region matches)

---

## Customising

### Replacing form designs
When Jess provides the branded HTML forms, update:
- `app/onboarding/OnboardingForm.tsx`
- `app/checkin/CheckinForm.tsx`

The field names and API submission logic stay the same — only the visual layout changes.

### Replacing PDF design
When Jess provides the Python PDF script reference, update:
- `lib/pdf/ClientPlanDocument.tsx`

The prop interface (`client`, `mealPlan`, `trainingPlan`, `version`, `includeNumbers`) stays the same.
