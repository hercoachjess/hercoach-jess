import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import type { CheckinSubmission, OnboardingPayload, Client } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const {
      client,
      checkin,
      previousCheckin,
      onboardingPayload,
    }: {
      client: Pick<Client, 'full_name' | 'goal' | 'primary_goal_kcal' | 'protein_target_g'>
      checkin: CheckinSubmission
      previousCheckin: CheckinSubmission | null
      onboardingPayload: OnboardingPayload | null
    } = await request.json()

    const prompt = `You are Jess, an HCPC-registered Registered Dietitian and coach replying to a weekly check-in. Write a personal, warm-but-professional response to ${client.full_name} based on what they shared this week.

CLIENT CONTEXT:
- Goal: ${client.goal || 'not set'}
- Daily targets: ${client.primary_goal_kcal || 'not set'} kcal, ${client.protein_target_g || 'not set'}g protein
${onboardingPayload?.health_screening?.injuries ? `- Injuries to respect: ${onboardingPayload.health_screening.injuries}` : ''}
${onboardingPayload?.health_screening?.conditions?.filter(c => c && !c.toLowerCase().includes('none')).join(', ') ? `- Diagnosed conditions: ${onboardingPayload.health_screening.conditions.filter(c => c && !c.toLowerCase().includes('none')).join(', ')}` : ''}
${onboardingPayload?.health_screening?.food_relationship ? `- Food relationship: ${onboardingPayload.health_screening.food_relationship}` : ''}

THIS WEEK'S CHECK-IN (Week ${checkin.week_number}):
${JSON.stringify(checkin.payload, null, 2)}
${checkin.body_measurements && Object.keys(checkin.body_measurements).length ? `Body measurements: ${JSON.stringify(checkin.body_measurements)}` : ''}

${previousCheckin ? `PREVIOUS CHECK-IN (Week ${previousCheckin.week_number}, for comparison):
${JSON.stringify(previousCheckin.payload, null, 2)}
${previousCheckin.body_measurements && Object.keys(previousCheckin.body_measurements).length ? `Body measurements: ${JSON.stringify(previousCheckin.body_measurements)}` : ''}` : 'No previous check-in to compare against — this may be Week 1.'}

YOUR RESPONSE — write a 4–8 paragraph reply that:
1. Opens warmly and acknowledges something specific they said (biggest win, hardest part, or feel)
2. Reflects honestly on the data — direction of change (good or otherwise), what's working, what to adjust
3. Gives 2–3 specific, actionable suggestions for the coming week (nutrition, training, recovery, or behavioural)
4. If they asked questions, answer them clinically and practically
5. If anything in this check-in suggests an eating-disorder-adjacent pattern, low energy availability, injury that needs medical attention, or out-of-scope clinical need — flag it sensitively and recommend appropriate next steps
6. Closes with a clear single ask or focus for the coming week

Voice: warm, professional, evidence-based, never preachy. UK English. First-person ("I"). Address client by first name. Avoid bullet points unless listing specific instructions — favour flowing paragraphs.

Respond with a JSON object ONLY, no markdown fences:
{
  "reply": "Full text of the reply, with paragraph breaks as \\n\\n",
  "concerns": ["Optional: any clinical concerns flagged for coach attention — empty array if none"]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let parsed: { reply: string; concerns?: string[] }
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 })
    }

    return NextResponse.json({
      reply: parsed.reply,
      concerns: parsed.concerns ?? [],
    })
  } catch (err) {
    console.error('AI check-in reply error:', err)
    return NextResponse.json({ error: 'Failed to draft reply.' }, { status: 500 })
  }
}
