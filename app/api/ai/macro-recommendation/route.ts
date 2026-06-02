import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Client, CheckinSubmission, MacroTargets } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface RequestBody {
  clientId: string
  currentTargets: MacroTargets
}

interface Recommendation {
  recommendation: MacroTargets
  reasoning: string
  confidence: 'low' | 'medium' | 'high'
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const { clientId, currentTargets }: RequestBody = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const [{ data: client, error: clientError }, { data: checkins, error: checkinError }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase
        .from('checkin_submissions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(4),
    ])

    if (clientError) {
      console.error('[macro-recommendation] client fetch:', clientError)
      return NextResponse.json({ error: clientError.message, code: clientError.code }, { status: 500 })
    }
    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
    }
    if (checkinError) {
      console.error('[macro-recommendation] check-in fetch:', checkinError)
      return NextResponse.json({ error: checkinError.message, code: checkinError.code }, { status: 500 })
    }
    if (!checkins || checkins.length === 0) {
      return NextResponse.json(
        { error: 'No check-ins on record yet — I need at least one to recommend macro changes.' },
        { status: 400 },
      )
    }

    const typedClient = client as Client
    const typedCheckins = checkins as CheckinSubmission[]
    const latest = typedCheckins[0]
    const previous = typedCheckins[1] ?? null

    const coachStyle = await getCoachStyleBlock()

    const prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian. The coach is on the meal plan tab for ${typedClient.full_name} and wants a macro-target recommendation grounded in the latest check-in and direction of travel.

CLIENT
- Name: ${typedClient.full_name}
- Goal: ${typedClient.goal || 'not set'}
- Starting weight: ${typedClient.starting_weight_kg ?? 'unknown'} kg
- Current weight (last known): ${typedClient.current_weight_kg ?? 'unknown'} kg

CURRENT MACRO TARGETS
- ${currentTargets.kcal} kcal · ${currentTargets.protein_g}g protein · ${currentTargets.fat_g}g fat · ${currentTargets.carbs_g}g carbs

LATEST CHECK-IN (Week ${latest.week_number ?? '?'}, ${latest.created_at.slice(0, 10)}):
${JSON.stringify(latest.payload, null, 2)}
${latest.body_measurements && Object.keys(latest.body_measurements).length ? `Body measurements: ${JSON.stringify(latest.body_measurements)}` : ''}

${previous ? `PREVIOUS CHECK-IN (Week ${previous.week_number ?? '?'}, ${previous.created_at.slice(0, 10)}) for direction-of-travel:
${JSON.stringify(previous.payload, null, 2)}
${previous.body_measurements && Object.keys(previous.body_measurements).length ? `Body measurements: ${JSON.stringify(previous.body_measurements)}` : ''}` : 'NO PREVIOUS CHECK-IN — this is the first one, so be conservative.'}

YOUR JOB
Recommend new daily macro targets for this client. Use the check-in data, weight direction, hunger, training feel, energy, sleep, and stress to justify your call.

Apply Jess's clinical judgement:
- For fat loss: 0.3–0.6% of body weight per week is healthy; >1% sustained means cut too aggressive. If weight is stalling for 2+ weeks but hunger / energy / training are fine, consider a 100–150 kcal cut. If hunger / energy / training are red flags, consider a small kcal increase or a refeed.
- For muscle gain / recomposition: aim for a small surplus (100–250 kcal) if training feel is good and weight is flat; ease back if weight is climbing too fast (>0.5% bw / week) without strength gains.
- Maintenance: keep kcal stable, adjust macro split if cravings / energy suggest it.
- Protein: 1.6–2.2 g/kg body weight is the evidence range (ISSN). Never go below 1.4 g/kg unless coach has flagged a clinical reason.
- Fat: minimum 0.6 g/kg for hormonal health, never below.
- Carbs: fill remaining kcal — bias higher when training intensity is high.

Round kcal to nearest 25, macros to nearest 5g. Check the macros add up: protein × 4 + carbs × 4 + fat × 9 ≈ kcal (±50 kcal tolerance).

The reasoning must be 2–4 sentences in Jess's voice, written so the coach can read it and immediately know WHY this is a good call to make for this client this week. Reference the specific check-in data points that drove the call (e.g. "weight flat 2 weeks at 1900, hunger manageable, training feel great → small cut is the right next move"). UK English. No fluff.

Confidence: "high" if there's clear evidence (≥2 weeks of consistent data + clean signals), "medium" if one check-in only or mixed signals, "low" if the data is contradictory or this is the first check-in.

Respond with a JSON object ONLY, no markdown fences:
{
  "recommendation": { "kcal": 1850, "protein_g": 140, "fat_g": 60, "carbs_g": 200 },
  "reasoning": "2–4 sentences as described above.",
  "confidence": "high" | "medium" | "low"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let parsed: Recommendation
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (err) {
      console.error('[macro-recommendation] JSON parse failed. Raw text:', text)
      return NextResponse.json(
        { error: 'Failed to parse AI response.', details: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      )
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[macro-recommendation] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate recommendation.' },
      { status: 500 },
    )
  }
}
