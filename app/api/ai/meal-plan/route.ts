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

    const coachStyle = await getCoachStyleBlock()
    const prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian (RD). Draft a one-day meal plan for your client ${clientName}.

Goal: ${goal}
Daily targets: ${targets.kcal} kcal, ${targets.protein_g}g protein, ${targets.fat_g}g fat, ${targets.carbs_g}g carbs
Meals per day: ${mealsPerDay || 4}
Dietary approach / preferences: ${foodPreferences || 'None specified'}
Allergies / intolerances: ${allergies || 'None'}
Foods they dislike: ${dislikes || 'None'}
Cooking ability: ${cookingAbility || 'Average'}

DO-NOT-USE RULE — CRITICAL:
The "Foods they dislike" and "Allergies" lists above are absolute. Every meal AND every alternative you generate must contain ZERO disliked or allergen ingredients. This includes:
- direct mentions ("mushrooms" → no portobello, chestnut, button, etc.)
- hidden forms (if they dislike fish, also avoid anchovies in pasta sauces, fish sauce, Worcestershire sauce, Caesar dressing)
- whole ingredient families (if "dairy-free" or "lactose intolerant", no milk/cheese/butter/yoghurt/cream — including hidden forms in pesto, baked goods, ready meals)
Treat this list as if breaking it would harm the client. If a typical recipe relies on a disliked ingredient, swap it for something equivalent.

Rules:
- Use UK supermarket foods. Where helpful, name specific products clients can put in their basket — e.g. "Tesco Wholemeal Bread", "Sainsbury's Skyr Natural Yoghurt", "Heck Chicken Italia Sausages (Tesco)", "Aldi Specially Selected Nut Butter", "M&S Cooked Chicken Breast Slices", "Waitrose Free-Range Eggs", "Asda Smart Price Tinned Tuna in Spring Water". Mix branded examples with generic items so the plan stays affordable.
- All quantities in grams or ml — no cups, no tablespoons for main items
- Keep it realistic and practical — no obscure ingredients
- Meals should be time-labelled (e.g. 07:30, 12:30, 15:30, 18:30)
- Each meal item should be one line: "150g chicken breast, grilled" or "1 Heck Chicken Italia sausage (50g)"
- Aim to approximately hit the macro targets across the day
- Include a short note on any substitution tips if relevant

ALTERNATIVES — REQUIRED for every meal:
For each meal, also generate 2 alternative versions ("alternatives" array) the client can swap to. Each alternative must hit the SAME macro target (±10%), respect the same dislikes/allergies, and offer genuine variety in flavour, prep style or shopping list. Label each alternative briefly — e.g. "Higher-carb training-day version", "Quicker 5-minute prep", "Veg-forward option", "Eat-out friendly".

Also include 4–6 evidence-based "food facts" about the most clinically interesting ingredients in this plan — short, factual statements that ${clientName} would find genuinely useful to know (not marketing fluff). Each fact must cite a credible source: BDA Food Fact Sheet, British Nutrition Foundation, NHS Eatwell Guide, NICE guidance, EFSA, peer-reviewed nutrition journals, or HCPC dietetic practice standards. Format facts as one-sentence-with-number-where-possible.

Respond with a JSON object ONLY, no markdown fences, in this exact structure:
{
  "meals": [
    {
      "name": "Breakfast",
      "time": "07:30",
      "items": ["80g rolled oats (Tesco Wholegrain Porridge Oats)", "200ml semi-skimmed milk", "1 medium banana (120g)"],
      "alternatives": [
        { "label": "Higher-protein swap", "items": ["170g Sainsbury's Skyr Natural Yoghurt", "30g granola", "1 medium banana"] },
        { "label": "Quick 2-minute prep", "items": ["1 Belvita Breakfast (45g)", "200ml semi-skimmed milk", "1 medium apple"] }
      ]
    },
    ...more meals...
  ],
  "food_facts": [
    {
      "food": "Greek yoghurt",
      "fact": "Provides ~17g of high-quality protein per 150g, plus calcium contributing to the daily 700mg RNI for adults.",
      "source": "BDA Food Fact Sheet — Calcium"
    },
    ...4–6 facts total...
  ],
  "coach_notes": "Brief overall note about the plan (optional)"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
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
    console.error('AI meal plan error:', err)
    return NextResponse.json({ error: 'Failed to generate meal plan.' }, { status: 500 })
  }
}
