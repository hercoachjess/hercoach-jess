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
- Use UK supermarket foods. Where helpful, suggest a specific brand or product the client can put in their basket — Tesco / Sainsbury's / Aldi / Lidl / M&S / Waitrose / Asda / Morrisons. Mix branded suggestions with generic items so the plan stays affordable.
- All quantities in grams or ml — no cups, no tablespoons for main items
- Keep it realistic and practical — no obscure ingredients
- Meals should be time-labelled (e.g. 07:30, 12:30, 15:30, 18:30)
- Aim to approximately hit the macro targets across the day

ITEM STRUCTURE — CRITICAL:
Each item must be split into TWO fields:
  - "food": the ingredient + quantity ONLY. Example: "80g rolled oats" or "150g chicken breast, grilled". NEVER include a brand in this field.
  - "brand": optional. The specific shop product, only when it genuinely helps. Example: "Tesco Wholegrain Porridge Oats" or "Heck Chicken Italia Sausages". Leave the field out entirely for generic items (e.g. "1 medium banana", "1 tsp olive oil") — no brand needed.
Roughly half the items in a meal should have a brand suggestion; the other half stay generic.

PREP NOTES — REQUIRED for every meal:
Add "prep_notes": a single short paragraph (1–3 sentences) describing how to prepare the meal — cooking method, timings, assembly order, any flavour tips. UK English. Practical, not preachy. Example: "Cook oats with the milk on the hob, simmer 5 mins, stirring. Top with sliced banana and a drizzle of peanut butter. Stir creatine into a glass of water alongside."

ALTERNATIVES — REQUIRED for every meal:
For each meal, also generate 2 alternative versions ("alternatives" array) the client can swap to. Each alternative must hit the SAME macro target (±10%), respect the same dislikes/allergies, and offer genuine variety in flavour, prep style or shopping list. Same item structure ({food, brand?}) and a prep_notes string. Label each alternative briefly — e.g. "Higher-carb training-day version", "Quicker 5-minute prep", "Veg-forward option", "Eat-out friendly".

Also include 4–6 evidence-based "food facts" about the most clinically interesting ingredients in this plan — short, factual statements that ${clientName} would find genuinely useful to know (not marketing fluff). Each fact must cite a credible source: BDA Food Fact Sheet, British Nutrition Foundation, NHS Eatwell Guide, NICE guidance, EFSA, peer-reviewed nutrition journals, or HCPC dietetic practice standards.

Respond with a JSON object ONLY, no markdown fences, in this exact structure:
{
  "meals": [
    {
      "name": "Breakfast",
      "time": "07:30",
      "items": [
        { "food": "80g rolled oats", "brand": "Tesco Wholegrain Porridge Oats" },
        { "food": "250ml semi-skimmed milk" },
        { "food": "1 medium banana (120g)" },
        { "food": "15g smooth peanut butter", "brand": "Meridian Natural" },
        { "food": "5g creatine monohydrate", "brand": "MyProtein Creapure" }
      ],
      "prep_notes": "Cook oats with the milk on the hob, simmer 5 mins, stirring. Top with sliced banana and a drizzle of peanut butter. Stir creatine into a glass of water alongside.",
      "alternatives": [
        {
          "label": "Higher-protein swap",
          "items": [
            { "food": "170g natural Skyr", "brand": "Sainsbury's Skyr" },
            { "food": "30g granola" },
            { "food": "1 medium banana" }
          ],
          "prep_notes": "Spoon Skyr into a bowl. Layer granola and sliced banana on top. Eat straight away."
        },
        {
          "label": "Quick 2-minute prep",
          "items": [
            { "food": "1 Belvita Breakfast biscuit pack (45g)" },
            { "food": "200ml semi-skimmed milk" },
            { "food": "1 medium apple" }
          ],
          "prep_notes": "Eat straight from the packet with a glass of milk and the apple on the side."
        }
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
