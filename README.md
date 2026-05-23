# HerCoach Jess — Private Coaching Platform

Private client-management platform for HerCoach Jess, run by Jess (HCPC-registered Registered Dietitian, BDA member, England & Wales). Built with Next.js 16, Supabase, and the Anthropic Claude API.

## 🟢 Live

- **Production URL**: https://meal-generator-murex.vercel.app (custom domain `app.hercoach.co.uk` may be configured — check Vercel Domains)
- **Vercel project**: [hercoach-jess](https://vercel.com/hercoachjess/hercoach-jess)
- **GitHub repo**: [hercoachjess/hercoach-jess](https://github.com/hercoachjess/hercoach-jess)
- **Supabase project**: [hercoachjess's Project](https://supabase.com/dashboard/project/ownmulrkykbbcnytuozi) (ref: `ownmulrkykbbcnytuozi`, EU West 1)
- **Coach login**: `hercoachjess@gmail.com`
- Auto-deploys on every push to `main`

> Backup of the original meal-generator code is preserved on the `meal-generator-archive` branch — it can be checked out at any time.

---

## Tech Stack

- **Next.js 16** (App Router) — frontend & API routes
- **Supabase** — Postgres + Auth + Storage
- **Tailwind CSS v4** — styling
- **@react-pdf/renderer** — branded plan PDFs
- **Anthropic Claude API** (`claude-sonnet-4-5`) — AI drafts
- **Recharts** — progress charts

---

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/onboarding` | Public | 7-step branded client onboarding form |
| `/checkin` | Public | Weekly check-in form |
| `/login` | Public | Coach sign-in (Supabase Auth) |
| `/dashboard` | Coach only | Client list + stats |
| `/dashboard/client/[id]` | Coach only | Full client file with 9 tabs |

Clients never log in — Jess shares the two form links with them. The dashboard is for the coach only.

---

## Local Development

### 1. Clone

```bash
git clone https://github.com/hercoachjess/hercoach-jess.git
cd hercoach-jess
npm install
```

### 2. Create `.env.local`

Copy `.env.local.example` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ownmulrkykbbcnytuozi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_vGvuhD5H2LLOUKwnP2FpcQ_2PEwEEkN
SUPABASE_SERVICE_ROLE_KEY=<copy from Supabase Dashboard → API Keys>
ANTHROPIC_API_KEY=<copy from console.anthropic.com or Vercel env vars>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard` → bounces to `/login` until you sign in.

---

## Deployment

Pushing to `main` auto-deploys to Vercel. No manual deploy step needed.

```bash
git push origin main
```

To configure env vars in production, use the [Vercel project settings](https://vercel.com/hercoachjess/hercoach-jess/settings/environment-variables).

---

## Database

Schema lives in `supabase/migrations/001_initial_schema.sql` and has already been applied to the production Supabase project. If you ever need to reset / recreate, run that SQL in the Supabase SQL Editor.

Tables:
- `clients` — client roster + macros + check-in day
- `onboarding_submissions` — full payload from `/onboarding`
- `checkin_submissions` — weekly check-ins
- `meal_plans` — current meal plan per client
- `training_plans` — current training plan per client
- `plan_history` — versioned snapshots + PDF URLs
- `payments` — payment tracking

Storage:
- `plan-pdfs` bucket — generated plan PDFs (public bucket, paths are UUID + timestamp so functionally unguessable)

RLS:
- Anon role: INSERT-only into the two submission tables
- Authenticated role (Jess): full access to all client data

---

## Dashboard Tabs

| Tab | What it does |
|-----|--------------|
| **Overview** | Stats, BMR/HR zone calcs, inline-editable targets |
| **Check-ins** | Expandable list of all weekly check-ins |
| **Compare & Feedback** | AI-drafted comparison summary — editable, approve before sending |
| **Progress Graphs** | Weight / training / wellbeing charts with PNG export |
| **Meal Plan** | AI-drafted or manually edited meal plan |
| **Training Plan** | AI-drafted or manually edited training programme |
| **Plan History** | Version-controlled snapshots + branded PDFs (with-numbers / no-numbers variants) |
| **Payments** | Log and track payments |
| **Onboarding File** | Read-only view of original onboarding answers |

---

## AI

- All AI generation is **server-side only** via `/api/ai/*` routes — the Anthropic API key never reaches the browser
- Every AI output is a **draft** that Jess reviews and edits before saving / sending
- Prompts are primed with: Jess is an HCPC-registered RD, evidence-based, UK foods, metric units, warm-professional voice

---

## PDF Generation

`lib/pdf/ClientPlanDocument.tsx` produces branded plan PDFs via `@react-pdf/renderer` — matches the visual design of the original ReportLab scripts:

- Black header bar with `hercoach · Jess` italic serif + spaced-caps tagline + dark RD badge
- Section 01 Training: warm-up, weekly structure, progressive overload, day-by-day exercise tables, cool-down
- Section 02 Yoga: dark "how to" box + yoga sequence table
- Section 03 Cardio: 2-col + HR zones table with Zone 2 highlighted
- Section 04 Nutrition: meal tables, snack strip, hydration/protein 2-col
- Section 05 General Guidance: sleep/stress, training day fuel, "a note from Jess"
- Closing panel with RD credentials + disclaimers
- Footer with confidentiality notice + page number

Two variants supported, picked at save time:
- **With numbers** — macro chips show kcal/protein, meals show `~kcal · Xg protein`
- **Without numbers** — chips show "Balanced", meals show foods + grams only

---

## Security & Compliance

- RLS enforced — anon can only INSERT into the two submission tables
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only; never sent to the browser
- `ANTHROPIC_API_KEY` is server-side only; never sent to the browser
- Both public forms include a UK GDPR privacy notice
- Health data resides in EU Supabase region (EU West 1)
- Plan history PDFs in private-ish public bucket with unguessable paths

---

## Source HTML / PDF designs

The authoritative visual designs live in the user's downloads folder:
- `hcj-onboarding-rd-final.html` — onboarding visual spec
- `hcj-checkin-final.html` — check-in visual spec
- `build_final_plan.py` — PDF design (with-numbers variant)
- `build_no_numbers.py` — PDF design (no-numbers variant)
