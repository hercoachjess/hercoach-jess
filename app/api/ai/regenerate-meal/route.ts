import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import type { Meal, MacroTargets } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized

  try {
    const {
      clientName,
      goal,
      targets,
      currentMeal,
      otherMeals,
      foodPreferences,
      allergies,
      dislikes,
      cookingAbility,
      instructions,
    }: {
      clientName: string
      goal: string
      targets: MacroTargets
      currentMeal: Meal
      otherMeals: Meal[]
      foodPreferences?: string
      allergies?: string
      dislikes?: string
      cookingAbility?: string
      instructions?: string
    } = await request.json()

    if (!currentMeal) {
      return NextResponse.json({ error: 'currentMeal is required.' }, { status: 400 })
    }

    // The other meals already cover some macro budget. The replacement should
    // sit in roughly the same slot of the day so we keep the same time and
    // suggest the model aim for the same macro share as the meal we're replacing.
    const coachStyle = await getCoachStyleBlock()
    const prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian (RD). The coach wants to swap out a single meal in ${clientName}'s plan for a different one. Generate ONE new meal that fits the same slot.

Client goal: ${goal}
Daily targets: ${targets.kcal} kcal, ${targets.protein_g}g protein, ${targets.fat_g}g fat, ${targets.carbs_g}g carbs
Dietary context: ${foodPreferences || 'No specific preferences recorded'}
Allergies / contraindications: ${allergies || 'None reported'}
Foods disliked: ${dislikes || 'None'}
Cooking ability: ${cookingAbility || 'Average'}

THE MEAL TO REPLACE (slot to keep — same name, same time):
${JSON.stringify(currentMeal, null, 2)}

THE OTHER MEALS ON THE PLAN (do NOT repeat these — pick a different angle, different proteins, different style):
${JSON.stringify(otherMeals, null, 2)}

${instructions?.trim() ? `COACH INSTRUCTIONS FOR THIS REGENERATION:\n${instructions.trim()}\n` : ''}
DO-NOT-USE RULE — CRITICAL:
The Allergies and Foods disliked lists are absolute. The new meal AND its alternatives must contain ZERO of those ingredients, including hidden forms (anchovies in pasta sauces if fish disliked; milk in pesto if dairy-free; etc.). Treat breaking this as if it would harm the client.

Rules:
- Keep the same meal slot — same "name" and "time" as the meal being replaced.
- Hit roughly the same macro share as the meal being replaced (the existing daily targets still apply).
- Use UK supermarket foods. Suggest specific brands where helpful (Tesco / Sainsbury's / Aldi / M&S etc.) — but only roughly half the items need a brand; keep generic items generic.
- All quantities in grams or ml.
- Produce 2 alternative versions of the new meal (same macro target ±10%, same rules) with labelled variants.

ITEM STRUCTURE — CRITICAL:
Each item is { "food": "<ingredient + quantity, NO brand here>", "brand": "<optional shop product name>" }. Generic items omit "brand" entirely.

PREP NOTES — REQUIRED:
The new meal and each alternative need a short "prep_notes" string (1–3 sentences) describing how to prepare it.

Respond with a JSON object ONLY, no markdown fences, in this exact structure:
{
  "meal": {
    "name": "${currentMeal.name}",
    "time": "${currentMeal.time}",
    "items": [
      { "food": "...", "brand": "..." },
      { "food": "..." }
    ],
    "prep_notes": "...",
    "alternatives": [
      { "label": "...", "items": [{ "food": "..." }], "prep_notes": "..." },
      { "label": "...", "items": [{ "food": "..." }], "prep_notes": "..." }
    ]
  }
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let parsed: { meal: Meal }
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (err) {
      console.error('[regenerate-meal] JSON parse failed. Raw:', text)
      return NextResponse.json(
        { error: 'Failed to parse AI response.', details: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      )
    }

    if (!parsed.meal || !Array.isArray(parsed.meal.items)) {
      return NextResponse.json({ error: 'AI response missing a valid meal.' }, { status: 500 })
    }

    return NextResponse.json({ meal: parsed.meal })
  } catch (err) {
    console.error('[regenerate-meal] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to regenerate meal.' },
      { status: 500 },
    )
  }
}
