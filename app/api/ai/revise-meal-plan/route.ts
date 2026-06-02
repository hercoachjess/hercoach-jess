import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import type { Meal, MacroTargets, FoodFact } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const {
      clientName,
      goal,
      targets,
      currentMeals,
      currentCoachNotes,
      instructions,
      foodPreferences,
      allergies,
      dislikes,
    }: {
      clientName: string
      goal: string
      targets: MacroTargets
      currentMeals: Meal[]
      currentCoachNotes: string
      instructions: string
      foodPreferences?: string
      allergies?: string
      dislikes?: string
    } = await request.json()

    if (!instructions || !instructions.trim()) {
      return NextResponse.json({ error: 'Please describe what to change.' }, { status: 400 })
    }

    const coachStyle = await getCoachStyleBlock()
    const prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian (RD). You are revising an existing meal plan for ${clientName} based on the coach's instructions. Apply ONLY the changes requested — keep everything else the same, including meal structure, timings and dietary suitability — unless the instructions specifically ask otherwise.

Client goal: ${goal}
Daily targets: ${targets.kcal} kcal, ${targets.protein_g}g protein, ${targets.fat_g}g fat, ${targets.carbs_g}g carbs
Dietary context: ${foodPreferences || 'No specific preferences recorded'}
Allergies / contraindications: ${allergies || 'None reported'}
Foods disliked: ${dislikes || 'None'}

CURRENT MEAL PLAN (JSON):
${JSON.stringify({ meals: currentMeals, coach_notes: currentCoachNotes }, null, 2)}

COACH INSTRUCTIONS:
${instructions.trim()}

DO-NOT-USE RULE — CRITICAL:
The Allergies and Foods disliked lists are absolute. Every meal AND every alternative must contain ZERO of those ingredients, including hidden forms (e.g. if "fish" is disliked, no anchovies, fish sauce, Worcestershire sauce, Caesar dressing). If a typical recipe relies on a disliked ingredient, swap it for something equivalent. Treat breaking this as if it would harm the client.

Rules:
- Apply only the changes requested — preserve everything else (including prep notes that aren't affected)
- Continue to use UK supermarket foods, suggesting specific brands where they genuinely help (Tesco / Sainsbury's / Aldi / Lidl / M&S / Waitrose). Mix branded with generic items.
- Quantities in grams or ml
- Re-balance macros if the changes have shifted them, but stay within ±5% of the daily targets
- Keep meal times consistent unless instructions say to change them

ITEM STRUCTURE — CRITICAL:
Each item is structured: { "food": "<ingredient + quantity, no brand>", "brand": "<optional shop product name>" }. The "food" field never contains a brand. Generic items omit "brand" entirely.

PREP NOTES — REQUIRED:
Every meal (and every alternative) must include a "prep_notes" string — 1–3 sentences describing how to prepare it. Update prep notes when the items change.

ALTERNATIVES — REQUIRED:
For each meal, produce 2 alternatives (same macro target ±10%, same dislike/allergy rules, same structured items + prep_notes). Label each briefly.

Also refresh the "food facts" — short evidence-based one-liners on 4–6 clinically interesting ingredients in the revised plan. Each must cite a credible source (BDA Food Fact Sheet, British Nutrition Foundation, NHS Eatwell Guide, NICE, EFSA, peer-reviewed nutrition journals).

Respond with a JSON object ONLY, no markdown fences, in this exact structure:
{
  "meals": [
    {
      "name": "Breakfast", "time": "07:30",
      "items": [
        { "food": "80g rolled oats", "brand": "Tesco Wholegrain Porridge Oats" },
        { "food": "250ml semi-skimmed milk" }
      ],
      "prep_notes": "Cook oats with the milk on the hob, simmer 5 mins, stirring.",
      "alternatives": [
        {
          "label": "Higher-protein swap",
          "items": [
            { "food": "170g natural Skyr", "brand": "Sainsbury's Skyr" },
            { "food": "30g granola" }
          ],
          "prep_notes": "Spoon Skyr into a bowl, layer granola on top."
        }
      ]
    }
  ],
  "food_facts": [
    { "food": "Salmon", "fact": "Provides ~2g long-chain omega-3 (EPA+DHA) per 100g — exceeds the SACN target of 250mg/day from a single serving twice a week.", "source": "SACN Advice on Fish Consumption (2004) + NHS Eatwell Guide" }
  ],
  "coach_notes": "Brief note on what changed and why"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let parsed: { meals: Meal[]; food_facts?: FoodFact[]; coach_notes?: string }
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 })
    }

    return NextResponse.json({
      meals: parsed.meals,
      food_facts: parsed.food_facts ?? [],
      coach_notes: parsed.coach_notes || '',
    })
  } catch (err) {
    console.error('AI revise meal plan error:', err)
    return NextResponse.json({ error: 'Failed to revise meal plan.' }, { status: 500 })
  }
}
