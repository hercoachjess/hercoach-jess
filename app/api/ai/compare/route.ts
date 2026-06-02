import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import type { CheckinPayload } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const body = await request.json()
    const {
      clientName,
      clientGoal,
      fromCheckin,
      toCheckin,
      areas,
    }: {
      clientName: string
      clientGoal: string
      fromCheckin: { payload: CheckinPayload; created_at: string; week_number: number }
      toCheckin:   { payload: CheckinPayload; created_at: string; week_number: number }
      areas: string[]
    } = body

    const fromDate = new Date(fromCheckin.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const toDate   = new Date(toCheckin.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const F = fromCheckin.payload
    const T = toCheckin.payload
    const lines: string[] = []

    if (areas.includes('weight') && F.weight_kg != null && T.weight_kg != null) {
      const diff = T.weight_kg - F.weight_kg
      lines.push(`Weight: ${F.weight_kg} kg → ${T.weight_kg} kg (${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg)`)
    }
    if (areas.includes('body_feel') && (F.body_feel || T.body_feel))
      lines.push(`Body feel: "${F.body_feel || '—'}" → "${T.body_feel || '—'}"`)
    if (areas.includes('adherence') && (F.nutrition_adherence || T.nutrition_adherence))
      lines.push(`Nutrition adherence: "${F.nutrition_adherence || '—'}" → "${T.nutrition_adherence || '—'}"`)
    if (areas.includes('hunger') && (F.hunger || T.hunger))
      lines.push(`Hunger: "${F.hunger || '—'}" → "${T.hunger || '—'}"`)
    if (areas.includes('training') && (F.training_sessions || T.training_sessions))
      lines.push(`Training sessions: "${F.training_sessions || '—'}" → "${T.training_sessions || '—'}" — feel: "${F.training_feel || '—'}" → "${T.training_feel || '—'}"`)
    if (areas.includes('sleep') && (F.sleep_quality || T.sleep_quality))
      lines.push(`Sleep: "${F.sleep_quality || '—'}" → "${T.sleep_quality || '—'}"`)
    if (areas.includes('stress') && (F.stress_level || T.stress_level))
      lines.push(`Stress: "${F.stress_level || '—'}" → "${T.stress_level || '—'}"`)
    if (areas.includes('energy') && (F.energy || T.energy))
      lines.push(`Energy: "${F.energy || '—'}" → "${T.energy || '—'}"`)
    if (areas.includes('mood') && (F.mood || T.mood))
      lines.push(`Mood: "${F.mood || '—'}" → "${T.mood || '—'}"`)
    if (areas.includes('wins')) {
      lines.push(`Win (${fromDate}): "${F.biggest_win || '—'}"`)
      lines.push(`Win (${toDate}): "${T.biggest_win || '—'}"`)
    }
    if (areas.includes('struggles')) {
      lines.push(`Hardest part (${fromDate}): "${F.hardest_part || '—'}"`)
      lines.push(`Hardest part (${toDate}): "${T.hardest_part || '—'}"`)
    }

    const coachStyle = await getCoachStyleBlock()
    const prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian (RD) and online fitness coach. You are writing a personalised check-in comparison summary for your client ${clientName}.

Client goal: ${clientGoal}
Comparison period: Week ${fromCheckin.week_number} (${fromDate}) to Week ${toCheckin.week_number} (${toDate})

Data:
${lines.join('\n')}

Instructions:
- Write in first person as Jess speaking directly to the client ("You've done...", "I can see...")
- Warm, encouraging, professional tone — like a supportive RD not a generic chatbot
- Lead with what's going well
- Acknowledge any challenges without shame or blame
- Reference evidence-based reasoning briefly where relevant (e.g. if sleep improved, note its role in recovery)
- End with 1–2 specific, practical encouragements or focus points for the coming week
- Keep it to 3–4 short paragraphs — readable and personal, not clinical
- UK spelling throughout
- No emojis, no headers, just natural prose`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ draft: text })
  } catch (err) {
    console.error('AI compare error:', err)
    return NextResponse.json({ error: 'Failed to generate draft.' }, { status: 500 })
  }
}
