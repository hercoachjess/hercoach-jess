import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Meal, MacroTargets } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const {
      clientName,
      goal,
      targets,
      foodPreferences,
      allergies,
      dislikes,
      cookingAbility,
      mealsPerDay,
    }: {
      clientName: string
      goal: string
      targets: MacroTargets
      foodPreferences: string
      allergies: string
      dislikes: string
      cookingAbility: string
      mealsPerDay: number
    } = await request.json()

    const prompt = `You are Jess, an HCPC-registered Registered Dietitian (RD). Draft a one-day meal plan for your client ${clientName}.

Goal: ${goal}
Daily targets: ${targets.kcal} kcal, ${targets.protein_g}g protein, ${targets.fat_g}g fat, ${targets.carbs_g}g carbs
Meals per day: ${mealsPerDay || 4}
Dietary approach / preferences: ${foodPreferences || 'None specified'}
Allergies / intolerances: ${allergies || 'None'}
Foods they dislike: ${dislikes || 'None'}
Cooking ability: ${cookingAbility || 'Average'}

Rules:
- Use UK supermarket foods (Tesco, Sainsbury's, Waitrose staples)
- All quantities in grams or ml — no cups, no tablespoons for main items
- Keep it realistic and practical — no obscure ingredients
- Meals should be time-labelled (e.g. 07:30, 12:30, 15:30, 18:30)
- Each meal item should be one line: "150g chicken breast, grilled"
- Aim to approximately hit the macro targets across the day
- Include a short note on any substitution tips if relevant

Respond with a JSON object ONLY, no markdown fences, in this exact structure:
{
  "meals": [
    {
      "name": "Breakfast",
      "time": "07:30",
      "items": ["80g rolled oats", "200ml semi-skimmed milk", "1 medium banana (120g)"]
    },
    ...more meals...
  ],
  "coach_notes": "Brief overall note about the plan (optional)"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let parsed: { meals: Meal[]; coach_notes?: string }
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 })
    }

    return NextResponse.json({ meals: parsed.meals, coach_notes: parsed.coach_notes || '' })
  } catch (err) {
    console.error('AI meal plan error:', err)
    return NextResponse.json({ error: 'Failed to generate meal plan.' }, { status: 500 })
  }
}
