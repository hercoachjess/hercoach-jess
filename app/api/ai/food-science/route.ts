import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractJson } from '@/lib/ai/extract-json'
import type { Client, CheckinSubmission, Meal, MacroTargets, FoodFact } from '@/types'

// Anthropic can run 20-40s on the longer prompts. Vercel default is 10s.
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface RequestBody {
  clientId: string
  meals: Meal[]
  targets: MacroTargets
}

/**
 * "The science behind your meals" generator.
 *
 * Produces richer, client- and goal-specific food notes for the meal plan
 * PDF. Unlike the short food_facts the meal-plan draft emits, each entry here
 * carries BOTH the clinical mechanism (`fact` + `source`) and a personalised
 * `why_for_you` line grounded in this client's goal and — when available —
 * their latest check-in, so refreshing the notes reflects how they're
 * actually doing.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const { clientId, meals, targets }: RequestBody = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required.' }, { status: 400 })
    }
    if (!Array.isArray(meals) || meals.length === 0) {
      return NextResponse.json({ error: 'Generate or save the meal plan first, then I can write the science notes.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const [{ data: client, error: clientError }, { data: checkins, error: checkinError }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase
        .from('checkin_submissions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(2),
    ])

    if (clientError) {
      console.error('[food-science] client fetch:', clientError)
      return NextResponse.json({ error: clientError.message, code: clientError.code }, { status: 500 })
    }
    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
    }
    if (checkinError) {
      console.error('[food-science] check-in fetch:', checkinError)
    }

    const typedClient = client as Client
    const typedCheckins = (checkins as CheckinSubmission[] | null) ?? []
    const latest = typedCheckins[0] ?? null

    // The distinct foods on the plan (main items + alternative items), so the
    // AI writes about ingredients that are actually in front of the client.
    const foods = Array.from(
      new Set(
        meals.flatMap((m) => [
          ...(m.items ?? []),
          ...((m.alternatives ?? []).flatMap((a) => a.items ?? [])),
        ].map((it) => (typeof it === 'string' ? it : it.food)).filter(Boolean)),
      ),
    )

    const coachStyle = await getCoachStyleBlock()
    const prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian (RD). Write "The Science Behind Your Meals" for your client ${typedClient.full_name} — a set of short, evidence-based notes about the key foods on THIS plan, made personal to them.

CLIENT
- Name: ${typedClient.full_name}
- Goal: ${typedClient.goal || 'general health'}
- Daily targets: ${targets.kcal} kcal · ${targets.protein_g}g protein · ${targets.fat_g}g fat · ${targets.carbs_g}g carbs
- Current weight (last known): ${typedClient.current_weight_kg ?? 'unknown'} kg

FOODS ON THE PLAN (write about the most clinically interesting 5–7 of these):
${foods.join(', ')}

${latest ? `LATEST CHECK-IN (Week ${latest.week_number ?? '?'}, ${latest.created_at.slice(0, 10)}) — reflect anything RELEVANT to nutrition (energy, hunger, cravings, sleep, training feel, digestion). Only mention it where a food genuinely connects to it; do not force it:
${JSON.stringify(latest.payload, null, 2)}` : 'NO CHECK-IN ON RECORD YET — keep the personalisation to their goal.'}

YOUR JOB
Pick the 5–7 most clinically interesting foods on the plan and, for each, write:
- "food": the food name.
- "fact": 1–2 sentences of real clinical science — the mechanism or nutrient action (e.g. what a nutrient does in the body, absorption, satiety, muscle protein synthesis, glycaemic response). Accurate, specific, not marketing. UK English.
- "why_for_you": 1 sentence connecting that food to THIS client — their goal, their targets, and (only where it genuinely fits) something from their latest check-in. Warm, direct, in Jess's voice, addressed to "you". Example: "For your fat-loss goal this is doing a lot of the heavy lifting — the protein here helps you hold onto muscle while you're in a deficit, and it'll blunt the mid-afternoon cravings you flagged last week."
- "source": a credible citation — BDA Food Fact Sheet, British Nutrition Foundation, NHS Eatwell Guide, NICE guidance, EFSA, ISSN position stands, or peer-reviewed nutrition journals.

Keep it genuinely useful and readable — a client should finish each note feeling they understand WHY this food is on their plan. No fluff, no hype, nothing that oversells.

Respond with a JSON object ONLY, no markdown fences, in this exact structure:
{
  "food_facts": [
    {
      "food": "Greek yoghurt",
      "fact": "Around 17g of high-quality, slow-digesting casein protein per 150g, plus calcium that contributes to the 700mg adult daily reference intake. The slow digestion drip-feeds amino acids, which supports overnight muscle repair.",
      "why_for_you": "For your recomp goal this is a smart evening choice — it keeps you fuller for longer and supports the muscle you're building in the gym, and it's an easy win on the days your hunger runs high.",
      "source": "BDA Food Fact Sheet, Calcium; ISSN Position Stand on Protein"
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const parsed = extractJson<{ food_facts?: FoodFact[] }>(text)
    if (!parsed || !Array.isArray(parsed.food_facts)) {
      console.error('[food-science] JSON parse failed. Raw:', text.slice(0, 400))
      return NextResponse.json({ error: "Couldn't read the AI response. Try again." }, { status: 500 })
    }

    return NextResponse.json({ food_facts: parsed.food_facts, used_checkin: !!latest })
  } catch (err) {
    console.error('[food-science] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate science notes.' },
      { status: 500 },
    )
  }
}
