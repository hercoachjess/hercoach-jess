import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import { extractJson } from '@/lib/ai/extract-json'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * "Where are they at?" briefing.
 *
 * Pulls everything Jess might need to land back in a client's world
 * after time away or before a discovery call: onboarding, the last 4
 * check-ins, current plans, quick notes, payments. AI returns a short
 * 3 to 4 paragraph briefing in Jess's voice.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized

  try {
    const { clientId }: { clientId: string } = await request.json()
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const [
      { data: client },
      { data: onboarding },
      { data: checkins },
      { data: mealPlan },
      { data: trainingPlan },
      { data: notes },
      { data: payments },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('checkin_submissions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(4),
      supabase.from('meal_plans').select('targets, updated_at, status').eq('client_id', clientId).eq('is_current', true).maybeSingle(),
      supabase.from('training_plans').select('level, days_per_week, programme_length_weeks, updated_at, status').eq('client_id', clientId).eq('is_current', true).maybeSingle(),
      supabase.from('client_notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(8),
      supabase.from('payments').select('amount_gbp, status, due_date, paid_date').eq('client_id', clientId).order('due_date', { ascending: false }).limit(4),
    ])

    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
    }

    const firstName = (client.full_name || '').split(' ')[0] || client.full_name

    const coachStyle = await getCoachStyleBlock()
    const prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian and coach. Jess is opening this client's file after some time away or before a call. Write her a quick "where are they at right now" briefing she can read in 30 seconds.

CLIENT
Name: ${client.full_name} (use "${firstName}")
Goal: ${client.goal || 'not set'}
Started: ${client.created_at}
Daily targets: ${client.primary_goal_kcal ?? '—'} kcal, ${client.protein_target_g ?? '—'}g protein
Status: ${client.status}

ONBOARDING SUBMISSION:
${onboarding ? JSON.stringify(onboarding.payload, null, 2) : 'None on record.'}

RECENT CHECK-INS (most recent first, up to 4):
${(checkins || []).length === 0 ? 'No check-ins yet.' : (checkins || []).map((c) => `Week ${c.week_number ?? '?'} (${c.created_at?.slice(0, 10)}):\n${JSON.stringify(c.payload, null, 2)}`).join('\n\n---\n\n')}

CURRENT PLANS:
Meal plan: ${mealPlan ? `targets ${JSON.stringify(mealPlan.targets)} (last edited ${mealPlan.updated_at})` : 'none set'}
Training plan: ${trainingPlan ? `${trainingPlan.level}, ${trainingPlan.days_per_week} days/week, ${trainingPlan.programme_length_weeks}-week programme (last edited ${trainingPlan.updated_at})` : 'none set'}

JESS'S OWN QUICK NOTES ON THIS CLIENT (most recent first):
${(notes || []).length === 0 ? 'None.' : (notes || []).map((n) => `${n.created_at?.slice(0, 10)}: ${n.body}`).join('\n')}

RECENT PAYMENTS:
${(payments || []).length === 0 ? 'None.' : (payments || []).map((p) => `£${p.amount_gbp} due ${p.due_date}, ${p.status}${p.paid_date ? ` (paid ${p.paid_date})` : ''}`).join('\n')}

WRITE THE BRIEFING
3 to 4 short paragraphs, plain prose, no headings, no bullets, no em dashes. UK English. Jess's voice. Cover roughly in this order:
1. Where this client is right now in their journey (week / phase / momentum, with the specific actual data, not generic).
2. The most important thing happening for them right now (their wins, their struggles, anything that's compounded or shifted over the recent check-ins).
3. What to focus on this week with them (one or two concrete things to bring up or check on, grounded in the actual data above).
4. Anything Jess needs to remember from her own notes / onboarding that's easy to forget.

Do NOT pad. Do NOT use any of these AI-tells: "absolutely", "incredible", "amazing", "let's dive in", "navigate", "lean into", "tap into", "elevate", "unlock", "remember,", em dashes for dramatic effect. Use commas, full stops or colons instead.

Respond with a JSON object ONLY, no markdown fences:
{
  "briefing": "The 3-4 paragraph briefing, with double-newlines between paragraphs."
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const parsed = extractJson<{ briefing: string }>(text)
    if (!parsed?.briefing) {
      console.error('[client-briefing] parse failed. stop=%s len=%d', message.stop_reason, text.length)
      return NextResponse.json({ error: "Couldn't read the AI response. Try again." }, { status: 500 })
    }

    return NextResponse.json({ briefing: parsed.briefing })
  } catch (err) {
    console.error('[client-briefing] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate briefing.' },
      { status: 500 },
    )
  }
}
