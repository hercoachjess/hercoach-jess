import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import type { CheckinPayload } from '@/types'

// Anthropic can run 20-40s on the longer prompts. Vercel default is 10s.
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface CheckinLite {
  payload: CheckinPayload
  created_at: string
  week_number: number | null
}

interface RequestBody {
  clientName: string
  clientGoal: string
  currentCheckin: CheckinLite
  previousCheckin?: CheckinLite | null
  areas: string[]
  // Amend mode: when both are present, revise the existing draft per the
  // instructions instead of writing a fresh one.
  currentDraft?: string
  amendInstructions?: string
}

const AREA_LABELS: Record<string, string> = {
  weight: 'Weight', body_feel: 'Body feel', adherence: 'Nutrition adherence',
  hunger: 'Hunger', training: 'Training', sleep: 'Sleep', stress: 'Stress',
  energy: 'Energy', mood: 'Mood', wins: 'Wins', struggles: 'Struggles',
}

/** Build the "this week (vs last week)" data lines for the chosen areas. */
function buildDataLines(T: CheckinPayload, F: CheckinPayload | null, areas: string[]): string[] {
  const lines: string[] = []
  const pair = (label: string, from: unknown, to: unknown) => {
    if (F) lines.push(`${label}: "${from ?? '—'}" → "${to ?? '—'}"`)
    else if (to != null && to !== '') lines.push(`${label}: "${to}"`)
  }
  if (areas.includes('weight')) {
    if (F && F.weight_kg != null && T.weight_kg != null) {
      const diff = T.weight_kg - F.weight_kg
      lines.push(`Weight: ${F.weight_kg} kg → ${T.weight_kg} kg (${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg)`)
    } else if (T.weight_kg != null) {
      lines.push(`Weight: ${T.weight_kg} kg`)
    }
  }
  if (areas.includes('body_feel')) pair('Body feel', F?.body_feel, T.body_feel)
  if (areas.includes('adherence')) pair('Nutrition adherence', F?.nutrition_adherence, T.nutrition_adherence)
  if (areas.includes('hunger')) pair('Hunger', F?.hunger, T.hunger)
  if (areas.includes('training')) {
    pair('Training sessions', F?.training_sessions, T.training_sessions)
    pair('Training feel', F?.training_feel, T.training_feel)
  }
  if (areas.includes('sleep')) pair('Sleep', F?.sleep_quality, T.sleep_quality)
  if (areas.includes('stress')) pair('Stress', F?.stress_level, T.stress_level)
  if (areas.includes('energy')) pair('Energy', F?.energy, T.energy)
  if (areas.includes('mood')) pair('Mood', F?.mood, T.mood)
  if (areas.includes('wins') && T.biggest_win) lines.push(`Biggest win this week: "${T.biggest_win}"`)
  if (areas.includes('struggles') && T.hardest_part) lines.push(`Hardest part this week: "${T.hardest_part}"`)
  if (T.questions_for_jess) lines.push(`Their question/note for you: "${T.questions_for_jess}"`)
  return lines
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const {
      clientName, clientGoal, currentCheckin, previousCheckin = null,
      areas, currentDraft, amendInstructions,
    }: RequestBody = await request.json()

    if (!currentCheckin?.payload) {
      return NextResponse.json({ error: 'A check-in is required.' }, { status: 400 })
    }

    const chosen = areas && areas.length ? areas : Object.keys(AREA_LABELS)
    const coachStyle = await getCoachStyleBlock()
    const isAmend = !!(currentDraft && currentDraft.trim() && amendInstructions && amendInstructions.trim())

    const toDate = new Date(currentCheckin.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const dataLines = buildDataLines(currentCheckin.payload, previousCheckin?.payload ?? null, chosen)

    const styleRules = `Instructions:
- Write in first person as Jess, speaking directly to ${clientName} ("You've...", "I can see...").
- Warm, encouraging, professional — a supportive RD, never a generic chatbot.
- Lead with what's going well; acknowledge challenges without shame or blame.
- Reference evidence-based reasoning briefly where relevant.
- End with 1–2 specific, practical focus points for the coming week.
- 3–4 short paragraphs, personal and readable, not clinical.
- UK spelling. No emojis, no headings — just natural prose the client can read.`

    let prompt: string
    if (isAmend) {
      prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian. You have already written check-in feedback for your client ${clientName} and now want to AMEND it.

YOUR CURRENT DRAFT:
"""
${currentDraft!.trim()}
"""

WHAT TO CHANGE:
${amendInstructions!.trim()}

Rewrite the draft applying that change. Keep everything else that is already working — same warmth, same voice, same facts. Return ONLY the revised feedback prose, nothing else.

${styleRules}`
    } else {
      prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian. Write this week's check-in feedback for your client ${clientName}, to send them directly.

Client goal: ${clientGoal || 'not set'}
This check-in: Week ${currentCheckin.week_number ?? '?'} (${toDate})
${previousCheckin ? `Compared with their previous check-in (Week ${previousCheckin.week_number ?? '?'}), so you can speak to the direction of travel.` : 'This is an early check-in with no prior week to compare — focus on this week and set them up well.'}

Data${previousCheckin ? ' (last week → this week)' : ''}:
${dataLines.join('\n') || '(limited data this week)'}

${styleRules}`
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ draft: text.trim() })
  } catch (err) {
    console.error('[checkin-feedback] error:', err)
    return NextResponse.json({ error: 'Failed to generate feedback.' }, { status: 500 })
  }
}
