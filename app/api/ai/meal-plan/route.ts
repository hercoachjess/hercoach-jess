import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import { extractJson } from '@/lib/ai/extract-json'
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

DO-NOT-USE RULE, CRITICAL:
The "Foods they dislike" and "Allergies" lists above are absolute. Every meal AND every alternative you generate must contain ZERO disliked or allergen ingredients. This includes:
- direct mentions ("mushrooms" → no portobello, chestnut, button, etc.)
- hidden forms (if they dislike fish, also avoid anchovies in pasta sauces, fish sauce, Worcestershire sauce, Caesar dressing)
- whole ingredient families (if "dairy-free" or "lactose intolerant", no milk/cheese/butter/yoghurt/cream, including hidden forms in pesto, baked goods, ready meals)
Treat this list as if breaking it would harm the client. If a typical recipe relies on a disliked ingredient, swap it for something equivalent.

Rules:
- Use UK supermarket foods. Where helpful, suggest a specific brand or product the client can put in their basket, Tesco / Sainsbury's / Aldi / Lidl / M&S / Waitrose / Asda / Morrisons. Mix branded suggestions with generic items so the plan stays affordable.
- All quantities in grams or ml, no cups, no tablespoons for main items
- Keep it realistic and practical, no obscure ingredients
- Meals should be time-labelled (e.g. 07:30, 12:30, 15:30, 18:30)
- Aim to approximately hit the macro targets across the day

ITEM STRUCTURE, CRITICAL:
Each item must be a structured object with these fields:
  - "food": the ingredient NAME only, no quantity, no brand. Example: "rolled oats", "chicken breast, grilled", "medium banana". NEVER include the quantity ("80g") in this field. NEVER include the brand.
  - "quantity": the numeric portion size, as a number. Example: 80 (for 80g oats), 1 (for 1 banana), 250 (for 250ml milk).
  - "unit": one of "g", "ml", "item", "tsp", "tbsp", "cup", "scoop". Use "item" for countable things (1 banana, 2 eggs).
  - "brand": optional. The specific shop product, only when it genuinely helps. Example: "Tesco Wholegrain Porridge Oats" or "Heck Chicken Italia Sausages". Omit the field entirely for generic items, no brand needed. Roughly half the items in a meal should have a brand.
  - "kcal", "protein_g", "fat_g", "carbs_g": evidence-based estimates for THIS portion (already multiplied through, not per 100g, but for the actual quantity). Use accurate values from McCance & Widdowson / USDA / BDA reference data. Round to 1 decimal place.

The daily totals (sum of kcal/protein/fat/carbs across all main meals) MUST be within ±5% of the macro targets at the top.

PREP NOTES, REQUIRED for every meal:
Add "prep_notes": a single short paragraph (1–3 sentences) describing how to prepare the meal, cooking method, timings, assembly order, any flavour tips. UK English. Practical, not preachy. Example: "Cook oats with the milk on the hob, simmer 5 mins, stirring. Top with sliced banana and a drizzle of peanut butter. Stir creatine into a glass of water alongside."

ALTERNATIVES, REQUIRED for every meal:
For each meal, also generate 2 alternative versions ("alternatives" array) the client can swap to. Each alternative must hit the SAME macro target (±10%), respect the same dislikes/allergies, and offer genuine variety in flavour, prep style or shopping list. Same item structure ({food, brand?}) and a prep_notes string. Label each alternative briefly, e.g. "Higher-carb training-day version", "Quicker 5-minute prep", "Veg-forward option", "Eat-out friendly".

Also include 4–6 evidence-based "food facts" about the most clinically interesting ingredients in this plan, short, factual statements that ${clientName} would find genuinely useful to know (not marketing fluff). Each fact must cite a credible source: BDA Food Fact Sheet, British Nutrition Foundation, NHS Eatwell Guide, NICE guidance, EFSA, peer-reviewed nutrition journals, or HCPC dietetic practice standards.

Respond with a JSON object ONLY, no markdown fences, in this exact structure:
{
  "meals": [
    {
      "name": "Breakfast",
      "time": "07:30",
      "items": [
        { "food": "rolled oats", "quantity": 80, "unit": "g", "brand": "Tesco Wholegrain Porridge Oats", "kcal": 304, "protein_g": 11, "fat_g": 6, "carbs_g": 49 },
        { "food": "semi-skimmed milk", "quantity": 250, "unit": "ml", "kcal": 118, "protein_g": 8.5, "fat_g": 4, "carbs_g": 12 },
        { "food": "medium banana", "quantity": 1, "unit": "item", "kcal": 105, "protein_g": 1.3, "fat_g": 0.4, "carbs_g": 27 },
        { "food": "smooth peanut butter", "quantity": 15, "unit": "g", "brand": "Meridian Natural", "kcal": 95, "protein_g": 3.5, "fat_g": 8, "carbs_g": 2 }
      ],
      "prep_notes": "Cook oats with the milk on the hob, simmer 5 mins, stirring. Top with sliced banana and a drizzle of peanut butter.",
      "alternatives": [
        {
          "label": "Higher-protein swap",
          "items": [
            { "food": "natural Skyr", "quantity": 170, "unit": "g", "brand": "Sainsbury's Skyr", "kcal": 105, "protein_g": 19, "fat_g": 0.3, "carbs_g": 7 },
            { "food": "granola", "quantity": 30, "unit": "g", "kcal": 135, "protein_g": 3, "fat_g": 5, "carbs_g": 19 },
            { "food": "medium banana", "quantity": 1, "unit": "item", "kcal": 105, "protein_g": 1.3, "fat_g": 0.4, "carbs_g": 27 }
          ],
          "prep_notes": "Spoon Skyr into a bowl. Layer granola and sliced banana on top. Eat straight away."
        }
      ]
    },
    ...more meals...
  ],
  "food_facts": [
    {
      "food": "Greek yoghurt",
      "fact": "Provides ~17g of high-quality protein per 150g, plus calcium contributing to the daily 700mg RNI for adults.",
      "source": "BDA Food Fact Sheet, Calcium"
    },
    ...4–6 facts total...
  ],
  "coach_notes": "Brief overall note about the plan (optional)"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const stopReason = message.stop_reason
    const usage = message.usage

    const parsed = extractJson<{ meals: Meal[]; food_facts?: FoodFact[]; coach_notes?: string }>(text)
    if (!parsed || !Array.isArray(parsed.meals)) {
      console.error(
        '[meal-plan] JSON parse failed. stop_reason=%s usage=%o raw length=%d. First 400 chars:\n%s',
        stopReason,
        usage,
        text.length,
        text.slice(0, 400),
      )
      const reason =
        stopReason === 'max_tokens'
          ? 'The AI ran out of room before finishing the plan. Try again, or simplify the request (fewer meals, fewer alternatives).'
          : "Couldn't read the AI response. Try again, if it keeps happening let Jess know."
      return NextResponse.json(
        { error: reason, stop_reason: stopReason },
        { status: 500 },
      )
    }

    return NextResponse.json({
      meals: parsed.meals,
      food_facts: parsed.food_facts ?? [],
      coach_notes: parsed.coach_notes || '',
    })
  } catch (err) {
    console.error('[meal-plan] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate meal plan.' },
      { status: 500 },
    )
  }
}
