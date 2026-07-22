import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import { extractJson } from '@/lib/ai/extract-json'
import type {
  CheckinSubmission,
  OnboardingPayload,
  Client,
  MacroTargets,
  DietPayload,
} from '@/types'

// Rich analytical prompt with structured output — allow up to 60s so it
// doesn't time out on Vercel (default is 10s).
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface WeeklyReviewBody {
  client: Pick<
    Client,
    | 'full_name'
    | 'goal'
    | 'sex'
    | 'current_weight_kg'
    | 'starting_weight_kg'
    | 'primary_goal_kcal'
    | 'protein_target_g'
    | 'fat_target_g'
    | 'carbs_target_g'
  >
  checkin: CheckinSubmission
  previousCheckin: CheckinSubmission | null
  priorSummaries?: { week_number: number | null; date: string; bullets: string[] }[]
  onboardingPayload: OnboardingPayload | null
  mealPlan: { targets: MacroTargets; coach_notes: string | null; meal_count: number } | null
  trainingPlan: {
    level: string
    days_per_week: number
    intensity: string | null
    training_style: string | null
    session_count: number
  } | null
  foodDiary: DietPayload | null
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const {
      client,
      checkin,
      previousCheckin,
      priorSummaries = [],
      onboardingPayload,
      mealPlan,
      trainingPlan,
      foodDiary,
    }: WeeklyReviewBody = await request.json()

    const firstName = (client.full_name || '').split(' ')[0] || client.full_name

    const currentTargets = mealPlan?.targets ?? {
      kcal: client.primary_goal_kcal ?? 0,
      protein_g: client.protein_target_g ?? 0,
      fat_g: client.fat_target_g ?? 0,
      carbs_g: client.carbs_target_g ?? 0,
    }

    const trendBlock = priorSummaries.length
      ? `RECENT WEEKS (for trend — judge changes on direction of travel, not one week):
${priorSummaries
  .map((s) => `Week ${s.week_number ?? '?'} (${s.date}):\n${s.bullets.map((b) => `  • ${b}`).join('\n')}`)
  .join('\n\n')}`
      : 'No earlier weeks on record yet — be cautious recommending big changes off a single check-in.'

    const foodDiaryBlock = foodDiary
      ? `THIS WEEK'S FOOD DIARY (what they actually logged — use it to sanity-check adherence and spot gaps like low protein, skipped meals, weekend drift):
${JSON.stringify(foodDiary, null, 2)}`
      : 'No food diary for this week — base the read on the check-in, trend and plan only. Do not invent food-diary detail.'

    const injuries = onboardingPayload?.health_screening?.injuries
    const conditions = onboardingPayload?.health_screening?.conditions
      ?.filter((c) => c && !c.toLowerCase().includes('none'))
      .join(', ')
    const foodRel = onboardingPayload?.health_screening?.food_relationship

    const coachStyle = await getCoachStyleBlock()
    const prompt =
      coachStyle +
      `You are Jess, an HCPC-registered Registered Dietitian, doing your weekly coaching review of ${firstName}. This is for YOUR eyes (the coach), except the final draft message which is for the client. Be sharp, specific and clinically sound. Recommend a change only when the data justifies it; holding steady is a valid, common call.

CLIENT
- Name: ${client.full_name} (use "${firstName}")
- Goal: ${client.goal || 'not set'}
- Sex: ${client.sex || 'not set'}
- Weight: starting ${client.starting_weight_kg ?? '?'} kg, current ${client.current_weight_kg ?? '?'} kg
- Current daily targets: ${currentTargets.kcal} kcal, ${currentTargets.protein_g}g protein, ${currentTargets.fat_g}g fat, ${currentTargets.carbs_g}g carbs
${injuries ? `- Injuries to respect: ${injuries}` : ''}
${conditions ? `- Diagnosed conditions: ${conditions}` : ''}
${foodRel ? `- Food relationship: ${foodRel}` : ''}

CURRENT PLAN
- Meal plan: ${mealPlan ? `${mealPlan.meal_count} meals, targets above${mealPlan.coach_notes ? `; coach notes: ${mealPlan.coach_notes}` : ''}` : 'none set yet'}
- Training plan: ${trainingPlan ? `${trainingPlan.level}, ${trainingPlan.days_per_week} days/week, intensity ${trainingPlan.intensity || 'n/a'}${trainingPlan.training_style ? `, ${trainingPlan.training_style}` : ''}, ${trainingPlan.session_count} sessions` : 'none set yet'}

THIS WEEK'S CHECK-IN (Week ${checkin.week_number}):
${JSON.stringify(checkin.payload, null, 2)}
${checkin.body_measurements && Object.keys(checkin.body_measurements).length ? `Body measurements: ${JSON.stringify(checkin.body_measurements)}` : ''}

${previousCheckin ? `LAST WEEK'S CHECK-IN (Week ${previousCheckin.week_number}):
${JSON.stringify(previousCheckin.payload, null, 2)}` : ''}

${trendBlock}

${foodDiaryBlock}

HOW TO REVIEW (evidence-based, UK dietetic practice)
- Weigh the whole picture: weight trend, adherence, hunger, energy, sleep, stress, training, mood. One bad week is noise; a two to three week trend is signal.
- For a fat-loss goal, aim for ~0.5–1% bodyweight/week loss; if loss has stalled 2–3 weeks AND adherence is genuinely good, a modest deficit nudge (~5–10% kcal, usually via carbs while protein stays high) is reasonable. If adherence is the issue, fix behaviour/plan first, not the numbers.
- Never crash calories or react to water-weight noise. Protect protein. Respect any disordered-eating history — if anything reads ED-adjacent, low energy availability, or out of scope, flag it and do NOT recommend a deficit.
- Only fill suggested_targets when a macro change is genuinely warranted this week; otherwise return null.

Respond with a JSON object ONLY, no markdown fences:
{
  "snapshot": ["3–5 short factual bullets: where they are vs last week/trend, weight direction, adherence"],
  "working_well": ["1–3 specific things going well, reference their actual numbers/foods/sessions"],
  "flags": ["clinical or behavioural concerns for your attention; empty array if none"],
  "recommendations": ["1–3 specific, actionable changes for this week — plan, food, training, habits; be concrete"],
  "suggested_targets": null OR { "kcal": number, "protein_g": number, "fat_g": number, "carbs_g": number, "rationale": "one sentence why" },
  "client_message": "A warm, human WhatsApp-style message to ${firstName} in Jess's voice — leads with the one thing that matters, mentions specifics, no headings/lists, no signoff, UK English, does not sound like AI."
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const parsed = extractJson<{
      snapshot?: string[]
      working_well?: string[]
      flags?: string[]
      recommendations?: string[]
      suggested_targets?: {
        kcal: number
        protein_g: number
        fat_g: number
        carbs_g: number
        rationale: string
      } | null
      client_message?: string
    }>(text)

    if (!parsed?.client_message && !parsed?.recommendations) {
      console.error('[weekly-review] parse failed. stop=%s len=%d', message.stop_reason, text.length)
      return NextResponse.json({ error: "Couldn't read the AI response. Try again." }, { status: 500 })
    }

    return NextResponse.json({
      review: {
        snapshot: parsed.snapshot ?? [],
        working_well: parsed.working_well ?? [],
        flags: parsed.flags ?? [],
        recommendations: parsed.recommendations ?? [],
        suggested_targets: parsed.suggested_targets ?? null,
        client_message: parsed.client_message ?? '',
        used_food_diary: !!foodDiary,
        generated_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[weekly-review] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate the weekly review.' },
      { status: 500 },
    )
  }
}
