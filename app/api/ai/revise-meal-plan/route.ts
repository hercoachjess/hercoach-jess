import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
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

    const prompt = `You are Jess, an HCPC-registered Registered Dietitian (RD). You are revising an existing meal plan for ${clientName} based on the coach's instructions. Apply ONLY the changes requested — keep everything else the same, including meal structure, timings and dietary suitability — unless the instructions specifically ask otherwise.

Client goal: ${goal}
Daily targets: ${targets.kcal} kcal, ${targets.protein_g}g protein, ${targets.fat_g}g fat, ${targets.carbs_g}g carbs
Dietary context: ${foodPreferences || 'No specific preferences recorded'}
Allergies / contraindications: ${allergies || 'None reported'}
Foods disliked: ${dislikes || 'None'}

CURRENT MEAL PLAN (JSON):
${JSON.stringify({ meals: currentMeals, coach_notes: currentCoachNotes }, null, 2)}

COACH INSTRUCTIONS:
${instructions.trim()}

Rules:
- Apply only the changes requested — preserve everything else
- Continue to use UK supermarket foods; quantities in grams or ml
- Re-balance macros if the changes have shifted them, but stay within ±5% of the daily targets
- Keep meal times consistent unless instructions say to change them
- Respect existing allergies / dietary restrictions at all times

Also refresh the "food facts" — short evidence-based one-liners on 4–6 clinically interesting ingredients in the revised plan. Each must cite a credible source (BDA Food Fact Sheet, British Nutrition Foundation, NHS Eatwell Guide, NICE, EFSA, peer-reviewed nutrition journals).

Respond with a JSON object ONLY, no markdown fences, in this exact structure:
{
  "meals": [
    { "name": "Breakfast", "time": "07:30", "items": ["80g rolled oats", "..."] }
  ],
  "food_facts": [
    { "food": "Salmon", "fact": "Provides ~2g long-chain omega-3 (EPA+DHA) per 100g — exceeds the SACN target of 250mg/day from a single serving twice a week.", "source": "SACN Advice on Fish Consumption (2004) + NHS Eatwell Guide" }
  ],
  "coach_notes": "Brief note on what changed and why"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
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
