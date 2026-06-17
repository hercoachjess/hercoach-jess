'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate, macrosForKcal, macroGuidance } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Client, MealPlan, Meal, MealItem, FoodFact, OnboardingSubmission } from '@/types'
import { normalizeMealItems } from '@/lib/meal'
import {
  itemMacros,
  itemHasMacros,
  mealMacros,
  planMacros,
  scaleItemQuantity,
  formatItemDisplay,
  formatMacrosShort,
  macroComparisonStatus,
} from '@/lib/meal-macros'

const UNIT_OPTIONS: MealItem['unit'][] = ['g', 'ml', 'item', 'tsp', 'tbsp', 'cup', 'scoop']

function normalizeMeals(meals: Meal[] | undefined | null): Meal[] {
  return (meals ?? []).map((m) => ({
    ...m,
    items: normalizeMealItems(m.items),
    alternatives: (m.alternatives ?? []).map((a) => ({
      ...a,
      items: normalizeMealItems(a.items),
    })),
  }))
}

interface Props {
  client: Client
  initialMealPlan: MealPlan | null
  onboarding: OnboardingSubmission | null
}

export default function MealPlanTab({ client, initialMealPlan, onboarding }: Props) {
  const router = useRouter()
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(initialMealPlan)
  const [editing, setEditing] = useState(false)
  const [editingMealIdx, setEditingMealIdx] = useState<number | null>(null)
  const [aiDrafting, setAiDrafting] = useState(false)
  const [aiRevising, setAiRevising] = useState(false)
  const [reviseInstructions, setReviseInstructions] = useState('')
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ob = onboarding?.payload

  // Local editable state — normalize legacy string items into { food, brand }.
  const [editedMeals, setEditedMeals] = useState<Meal[]>(() => normalizeMeals(mealPlan?.meals))
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null)

  // Per-meal AI proposals. When Jess clicks "Propose new version" the AI's
  // suggested meal lands here (keyed by meal index) for explicit review
  // rather than silently replacing the current meal in editedMeals. She then
  // clicks Accept to apply it or Discard to throw it away.
  const [mealInstructions, setMealInstructions] = useState<Record<number, string>>({})
  const [pendingMeals, setPendingMeals] = useState<Record<number, Meal>>({})

  // Whole-plan macro rescale. When Jess edits kcal / macros and clicks
  // "Rescale meals to new macros", the AI keeps the same meals but adjusts
  // portions. Result lands here for review before applying.
  const [rescaleBusy, setRescaleBusy] = useState(false)
  const [pendingRescale, setPendingRescale] = useState<{
    meals: Meal[]
    coach_notes: string
    food_facts: FoodFact[]
  } | null>(null)
  const [editedTargets, setEditedTargets] = useState(
    mealPlan?.targets ?? {
      kcal: client.primary_goal_kcal ?? 2000,
      protein_g: client.protein_target_g ?? 150,
      fat_g: client.fat_target_g ?? 70,
      carbs_g: client.carbs_target_g ?? 200,
    }
  )
  const [coachNotes, setCoachNotes] = useState(mealPlan?.coach_notes ?? '')
  const [foodFacts, setFoodFacts] = useState<FoodFact[]>(mealPlan?.food_facts ?? [])

  // AI macro recommendation state. macroRec holds the AI's proposed targets +
  // reasoning so the coach can review before applying. Null until requested.
  const [macroRec, setMacroRec] = useState<{
    recommendation: { kcal: number; protein_g: number; fat_g: number; carbs_g: number }
    reasoning: string
    confidence: 'low' | 'medium' | 'high'
  } | null>(null)
  const [macroRecBusy, setMacroRecBusy] = useState(false)
  const [macroRecError, setMacroRecError] = useState('')

  async function getMacroRecommendation() {
    setMacroRecBusy(true); setMacroRecError(''); setMacroRec(null)
    try {
      const res = await fetch('/api/ai/macro-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, currentTargets: editedTargets }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get recommendation.')
      setMacroRec(data)
    } catch (e: unknown) {
      setMacroRecError(e instanceof Error ? e.message : 'Failed to get recommendation.')
    } finally {
      setMacroRecBusy(false)
    }
  }

  function applyMacroRecommendation() {
    if (!macroRec) return
    setEditedTargets(macroRec.recommendation)
    setMacroRec(null)
    setEditing(true)
  }

  // Live guidance ranges based on the current edited targets.
  const guidance = macroGuidance(editedTargets.protein_g, editedTargets.fat_g, editedTargets.carbs_g)

  async function aiDraft() {
    setAiDrafting(true)
    setError('')
    try {
      const food = ob?.food_preferences
      const health = ob?.health_screening
      // Translate "3 + snacks" / "4–5 meals" / etc. into a number for the prompt.
      const mealsPerDay = (() => {
        const raw = (food?.meals_per_day || '').toLowerCase()
        if (raw.includes('2')) return 3
        if (raw.includes('4')) return 5
        if (raw.includes('snack')) return 4
        if (raw.includes('3')) return 3
        return 4
      })()
      // Merge dietary signals so the AI gets a single clear preference string.
      const dietaryParts: string[] = []
      if (food?.diet_type && food.diet_type.toLowerCase() !== 'no restrictions') dietaryParts.push(food.diet_type)
      if (food?.foods_loved) dietaryParts.push(`Foods loved: ${food.foods_loved}`)
      if (food?.eating_pattern) dietaryParts.push(`Current eating pattern: ${food.eating_pattern}`)
      if (food?.meal_prep) dietaryParts.push(`Meal prep: ${food.meal_prep}`)
      if (food?.supplements) dietaryParts.push(`Supplements: ${food.supplements}`)
      // Combine medical conditions + pregnancy / breastfeeding into allergy/contraindication context.
      const allergyParts: string[] = []
      if (food?.allergies) allergyParts.push(food.allergies)
      if (health?.conditions?.length) {
        const flags = health.conditions.filter((c) => c && c.toLowerCase() !== 'none of the above')
        if (flags.length) allergyParts.push(`Diagnosed: ${flags.join(', ')}`)
      }
      if (health?.pregnancy && health.pregnancy.toLowerCase() !== 'no') {
        allergyParts.push(`Pregnancy status: ${health.pregnancy} (apply NICE guidance — avoid contraindicated foods, adjust energy)`)
      }
      if (health?.medications) allergyParts.push(`Medications: ${health.medications}`)

      const res = await fetch('/api/ai/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.full_name,
          goal: client.goal || '',
          targets: editedTargets,
          foodPreferences: dietaryParts.join(' | ') || 'No specific preferences recorded',
          allergies: allergyParts.join(' | ') || 'None reported',
          dislikes: [food?.foods_disliked, client.food_dislikes_override].filter(Boolean).join('; ') || '',
          cookingAbility: food?.cooking_confidence || '',
          mealsPerDay,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditedMeals(normalizeMeals(data.meals))
      if (data.food_facts) setFoodFacts(data.food_facts)
      if (data.coach_notes) setCoachNotes(data.coach_notes)
      setEditing(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI draft failed.')
    } finally {
      setAiDrafting(false)
    }
  }

  async function aiRevise() {
    if (!reviseInstructions.trim()) {
      setError('Please describe what to change.')
      return
    }
    setAiRevising(true)
    setError('')
    try {
      const food = ob?.food_preferences
      const health = ob?.health_screening
      const dietaryParts: string[] = []
      if (food?.diet_type && food.diet_type.toLowerCase() !== 'no restrictions') dietaryParts.push(food.diet_type)
      if (food?.foods_loved) dietaryParts.push(`Foods loved: ${food.foods_loved}`)
      if (food?.eating_pattern) dietaryParts.push(`Eating pattern: ${food.eating_pattern}`)
      const allergyParts: string[] = []
      if (food?.allergies) allergyParts.push(food.allergies)
      if (health?.conditions?.length) {
        const flags = health.conditions.filter((c) => c && c.toLowerCase() !== 'none of the above')
        if (flags.length) allergyParts.push(`Diagnosed: ${flags.join(', ')}`)
      }
      if (health?.pregnancy && health.pregnancy.toLowerCase() !== 'no') {
        allergyParts.push(`Pregnancy status: ${health.pregnancy}`)
      }

      const res = await fetch('/api/ai/revise-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.full_name,
          goal: client.goal || '',
          targets: editedTargets,
          currentMeals: editedMeals,
          currentCoachNotes: coachNotes,
          instructions: reviseInstructions,
          foodPreferences: dietaryParts.join(' | ') || 'No specific preferences recorded',
          allergies: allergyParts.join(' | ') || 'None reported',
          dislikes: [food?.foods_disliked, client.food_dislikes_override].filter(Boolean).join('; ') || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditedMeals(normalizeMeals(data.meals))
      if (data.food_facts) setFoodFacts(data.food_facts)
      if (data.coach_notes) setCoachNotes(data.coach_notes)
      setReviseInstructions('')
      setEditing(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Revision failed.')
    } finally {
      setAiRevising(false)
    }
  }

  async function exportPdf() {
    setExporting(true)
    setError('')
    try {
      const res = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          mealPlan: {
            ...(mealPlan ?? {}),
            targets: editedTargets,
            meals: editedMeals,
            coach_notes: coachNotes,
          },
          trainingPlan: null,
          version: mealPlan?.status === 'saved' ? 'current' : 'draft',
          includeNumbers: true,
          scope: 'meal',
          mode: 'inline',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Export failed.' }))
        throw new Error(data.error || 'Export failed.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${client.full_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-meal-plan.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  async function saveDraft() {
    setSaving(true)
    setError('')
    const supabase = createClient()
    const now = new Date().toISOString()

    if (mealPlan?.id) {
      await supabase.from('meal_plans').update({
        meals: editedMeals,
        targets: editedTargets,
        food_facts: foodFacts,
        coach_notes: coachNotes,
        status: 'draft',
        updated_at: now,
      }).eq('id', mealPlan.id)
    } else {
      const { data } = await supabase.from('meal_plans').insert({
        client_id: client.id,
        meals: editedMeals,
        targets: editedTargets,
        food_facts: foodFacts,
        coach_notes: coachNotes,
        status: 'draft',
        is_current: true,
        updated_at: now,
      }).select().single()
      if (data) setMealPlan(data)
    }
    setEditing(false)
    setSaving(false)
    router.refresh()
  }

  function updateMealItemField(mealIdx: number, itemIdx: number, field: 'food' | 'brand', value: string) {
    setEditedMeals((meals) => {
      const updated = [...meals]
      const items = [...updated[mealIdx].items]
      items[itemIdx] = { ...items[itemIdx], [field]: value }
      updated[mealIdx] = { ...updated[mealIdx], items }
      return updated
    })
  }

  // Quantity edit — linearly scales kcal / protein / fat / carbs from
  // the previous quantity so daily totals update live.
  function updateMealItemQuantity(mealIdx: number, itemIdx: number, raw: string) {
    const next = raw === '' ? NaN : Number(raw)
    setEditedMeals((meals) => {
      const updated = [...meals]
      const items = [...updated[mealIdx].items]
      const current = items[itemIdx]
      if (Number.isFinite(next)) {
        items[itemIdx] = scaleItemQuantity(current, next)
      } else {
        items[itemIdx] = { ...current, quantity: undefined }
      }
      updated[mealIdx] = { ...updated[mealIdx], items }
      return updated
    })
  }

  function updateMealItemUnit(mealIdx: number, itemIdx: number, unit: MealItem['unit']) {
    setEditedMeals((meals) => {
      const updated = [...meals]
      const items = [...updated[mealIdx].items]
      items[itemIdx] = { ...items[itemIdx], unit }
      updated[mealIdx] = { ...updated[mealIdx], items }
      return updated
    })
  }

  function addMealItem(mealIdx: number) {
    setEditedMeals((meals) => {
      const updated = [...meals]
      const blank: MealItem = { food: '', brand: '', quantity: undefined, unit: 'g' }
      updated[mealIdx] = { ...updated[mealIdx], items: [...updated[mealIdx].items, blank] }
      return updated
    })
  }

  function removeMealItem(mealIdx: number, itemIdx: number) {
    setEditedMeals((meals) => {
      const updated = [...meals]
      updated[mealIdx] = {
        ...updated[mealIdx],
        items: updated[mealIdx].items.filter((_, i) => i !== itemIdx),
      }
      return updated
    })
  }

  function updateMealPrep(mealIdx: number, value: string) {
    setEditedMeals((meals) => {
      const updated = [...meals]
      updated[mealIdx] = { ...updated[mealIdx], prep_notes: value }
      return updated
    })
  }

  // Ask the AI to propose a new version of a single meal. Optional
  // free-text instructions (e.g. "swap chicken for tofu", "lower fat",
  // "make it 5-min prep") sharpen the request. The result lands in
  // pendingMeals[mealIdx] for review — it does NOT replace the current
  // meal in editedMeals until Jess clicks Accept.
  async function proposeMealChange(mealIdx: number) {
    setRegeneratingIdx(mealIdx)
    setError('')
    try {
      const food = ob?.food_preferences
      const health = ob?.health_screening
      const dietaryParts: string[] = []
      if (food?.diet_type && food.diet_type.toLowerCase() !== 'no restrictions') dietaryParts.push(food.diet_type)
      if (food?.foods_loved) dietaryParts.push(`Foods loved: ${food.foods_loved}`)
      if (food?.eating_pattern) dietaryParts.push(`Current eating pattern: ${food.eating_pattern}`)
      const allergyParts: string[] = []
      if (food?.allergies) allergyParts.push(food.allergies)
      if (health?.conditions?.length) {
        const flags = health.conditions.filter((c) => c && c.toLowerCase() !== 'none of the above')
        if (flags.length) allergyParts.push(`Diagnosed: ${flags.join(', ')}`)
      }
      const otherMeals = editedMeals.filter((_, i) => i !== mealIdx)
      const res = await fetch('/api/ai/regenerate-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.full_name,
          goal: client.goal || '',
          targets: editedTargets,
          currentMeal: editedMeals[mealIdx],
          otherMeals,
          foodPreferences: dietaryParts.join(' | ') || 'No specific preferences recorded',
          allergies: allergyParts.join(' | ') || 'None reported',
          dislikes: [food?.foods_disliked, client.food_dislikes_override].filter(Boolean).join('; ') || '',
          cookingAbility: food?.cooking_confidence || '',
          instructions: mealInstructions[mealIdx]?.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Regeneration failed')
      const normalized: Meal = {
        ...data.meal,
        items: normalizeMealItems(data.meal.items),
        alternatives: (data.meal.alternatives ?? []).map((a: { label: string; items: (string | MealItem)[]; prep_notes?: string }) => ({
          ...a,
          items: normalizeMealItems(a.items),
        })),
      }
      setPendingMeals((p) => ({ ...p, [mealIdx]: normalized }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to propose new meal.')
    } finally {
      setRegeneratingIdx(null)
    }
  }

  function acceptMealProposal(mealIdx: number) {
    const proposed = pendingMeals[mealIdx]
    if (!proposed) return
    setEditedMeals((meals) => meals.map((m, i) => (i === mealIdx ? proposed : m)))
    setPendingMeals((p) => {
      const next = { ...p }
      delete next[mealIdx]
      return next
    })
    setMealInstructions((m) => {
      const next = { ...m }
      delete next[mealIdx]
      return next
    })
  }

  function discardMealProposal(mealIdx: number) {
    setPendingMeals((p) => {
      const next = { ...p }
      delete next[mealIdx]
      return next
    })
  }

  // Whole-plan rescale — when targets change, ask the AI to keep the
  // same meals (same dishes, same labels, same prep) but adjust the
  // quantities so daily totals hit the new macros. Lands in pendingRescale
  // for review.
  async function rescaleMealsToTargets() {
    if (editedMeals.length === 0) {
      setError('Generate or save a meal plan first, then macros can be rescaled.')
      return
    }
    setRescaleBusy(true)
    setError('')
    try {
      const food = ob?.food_preferences
      const health = ob?.health_screening
      const dietaryParts: string[] = []
      if (food?.diet_type && food.diet_type.toLowerCase() !== 'no restrictions') dietaryParts.push(food.diet_type)
      if (food?.foods_loved) dietaryParts.push(`Foods loved: ${food.foods_loved}`)
      const allergyParts: string[] = []
      if (food?.allergies) allergyParts.push(food.allergies)
      if (health?.conditions?.length) {
        const flags = health.conditions.filter((c) => c && c.toLowerCase() !== 'none of the above')
        if (flags.length) allergyParts.push(`Diagnosed: ${flags.join(', ')}`)
      }
      const instructions = `MACRO RESCALE ONLY. Keep every meal exactly as it is — same dishes, same item types, same brand suggestions, same meal names, same times, same alternatives, same prep notes. The ONLY change permitted is the QUANTITIES (grams / ml) of the items so the daily totals hit the new targets: ${editedTargets.kcal} kcal, ${editedTargets.protein_g}g protein, ${editedTargets.fat_g}g fat, ${editedTargets.carbs_g}g carbs. Do NOT swap any ingredients. Do NOT change meal names or times. Do NOT change the alternatives' food choices, only their portion sizes.`
      const res = await fetch('/api/ai/revise-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.full_name,
          goal: client.goal || '',
          targets: editedTargets,
          currentMeals: editedMeals,
          currentCoachNotes: coachNotes,
          instructions,
          foodPreferences: dietaryParts.join(' | ') || 'No specific preferences recorded',
          allergies: allergyParts.join(' | ') || 'None reported',
          dislikes: [food?.foods_disliked, client.food_dislikes_override].filter(Boolean).join('; ') || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rescale failed')
      setPendingRescale({
        meals: normalizeMeals(data.meals),
        coach_notes: data.coach_notes || coachNotes,
        food_facts: data.food_facts || foodFacts,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to rescale meals.')
    } finally {
      setRescaleBusy(false)
    }
  }

  function acceptRescale() {
    if (!pendingRescale) return
    setEditedMeals(pendingRescale.meals)
    if (pendingRescale.coach_notes) setCoachNotes(pendingRescale.coach_notes)
    if (pendingRescale.food_facts.length > 0) setFoodFacts(pendingRescale.food_facts)
    setPendingRescale(null)
  }

  function discardRescale() {
    setPendingRescale(null)
  }

  // Aggregate everything the AI MUST avoid + everything the client loves,
  // straight from the onboarding form plus any coach-added overrides.
  const dietType = ob?.food_preferences?.diet_type || ''
  const foodsLoved = ob?.food_preferences?.foods_loved || ''
  const foodsDisliked = ob?.food_preferences?.foods_disliked || ''
  const allergies = ob?.food_preferences?.allergies || ''
  const cookingConfidence = ob?.food_preferences?.cooking_confidence || ''
  const mealsPerDayLabel = ob?.food_preferences?.meals_per_day || ''
  const dislikeOverride = client.food_dislikes_override || ''
  const hasPreferences = dietType || foodsLoved || foodsDisliked || allergies || dislikeOverride

  return (
    <div className="flex flex-col gap-5">
      {/* Client food preferences — visible at the top so the coach always sees
          what the client loves / hates / can't eat before generating or editing. */}
      {hasPreferences && (
        <Card>
          <CardHeader>
            <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Client food preferences</span>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {(foodsDisliked || dislikeOverride || allergies) && (
              <div className="px-3 py-2 border-l-2 border-[#c89a6a] bg-[rgba(200,154,106,0.05)]">
                <p className="text-xs tracking-wider uppercase text-[#c89a6a] mb-1">AI will never include these</p>
                {(foodsDisliked || dislikeOverride) && (
                  <p className="text-sm text-[#e0d8cc] leading-relaxed">
                    <span className="text-[#b8b4ac]">Disliked:</span> {[foodsDisliked, dislikeOverride].filter(Boolean).join(' · ')}
                  </p>
                )}
                {allergies && (
                  <p className="text-sm text-[#e0d8cc] leading-relaxed mt-0.5">
                    <span className="text-[#b8b4ac]">Allergies / intolerances:</span> {allergies}
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {foodsLoved && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-[#7da87d] tracking-wider uppercase mb-0.5">Foods they love</p>
                  <p className="text-sm text-[#e0d8cc] leading-relaxed">{foodsLoved}</p>
                </div>
              )}
              {dietType && <PrefRow label="Diet type" value={dietType} />}
              {cookingConfidence && <PrefRow label="Cooking confidence" value={cookingConfidence} />}
              {mealsPerDayLabel && <PrefRow label="Meals per day" value={mealsPerDayLabel} />}
            </div>
            <p className="text-xs text-[#8a8680] italic leading-relaxed">
              Add more &ldquo;never include&rdquo; foods on Overview → Edit contact (the &ldquo;extra food dislikes&rdquo; field). Useful when a client tells you something new mid-coaching.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Header card */}
      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#b8b4ac] mb-1">
              Status: <span className="text-[#e0d8cc]">{mealPlan?.status ?? 'No plan'}</span>
              {mealPlan?.updated_at && (
                <span className="ml-3">Last edited: {formatDate(mealPlan.updated_at)}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" loading={aiDrafting} onClick={aiDraft}>
              AI draft new version
            </Button>
            {editedMeals.length > 0 && (
              <Button variant="outline" size="sm" loading={exporting} onClick={exportPdf}>
                Export as PDF
              </Button>
            )}
            {mealPlan && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Ask AI to change */}
      {editedMeals.length > 0 && (
        <Card>
          <CardHeader>
            <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Ask AI to change this plan</span>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <textarea
              className="input-underline text-sm"
              rows={3}
              placeholder="e.g. Swap chicken for salmon at lunch · Add a higher-carb breakfast on training days · Make it dairy-free · Lower the calories by 200 across the day"
              value={reviseInstructions}
              onChange={(e) => setReviseInstructions(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[#8a8680] leading-relaxed flex-1">
                The AI rewrites only what you ask — everything else stays as it is. You always review and approve before saving.
              </p>
              <Button size="sm" loading={aiRevising} disabled={!reviseInstructions.trim()} onClick={aiRevise}>
                Update plan
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Targets row — editing kcal auto-snaps protein/fat/carbs to the goal-tiered split */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { key: 'kcal',      label: 'Calories', unit: 'kcal', range: undefined as [number, number] | undefined },
          { key: 'protein_g', label: 'Protein',  unit: 'g',    range: guidance.protein },
          { key: 'fat_g',     label: 'Fat',      unit: 'g',    range: guidance.fat },
          { key: 'carbs_g',   label: 'Carbs',    unit: 'g',    range: guidance.carbs },
        ] as const).map(({ key, label, unit, range }) => (
          <Card key={key}>
            <CardBody className="py-3">
              <p className="text-xs text-[#b8b4ac] mb-1">{label}</p>
              {editing ? (
                <input
                  type="number"
                  className="input-underline text-lg w-full"
                  value={editedTargets[key]}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (key === 'kcal') {
                      const recomputed = macrosForKcal(v, client.current_weight_kg, client.goal)
                      setEditedTargets((t) => ({
                        ...t,
                        kcal: v,
                        ...(recomputed ?? {}),
                      }))
                    } else {
                      setEditedTargets((t) => ({ ...t, [key]: v }))
                    }
                  }}
                />
              ) : (
                <p className="text-xl text-[#f0ece4]">
                  {editedTargets[key]}<span className="text-sm text-[#b8b4ac] ml-1">{unit}</span>
                </p>
              )}
              {range && (
                <p className="text-xs text-[#8a8680] mt-1">Aim {range[0]}–{range[1]} g</p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {editing && (
        <p className="text-xs text-[#8a8680] italic leading-relaxed -mt-2">
          Changing calories snaps protein / fat / carbs to the research-based split for the client&apos;s goal — override any field by hand if needed. To change the client&apos;s overall macro defaults, edit Coach Targets on Overview.
        </p>
      )}

      {/* Daily totals — live sum of every item's macros, compared to the
          targets above. Sage-green if within 5% of each target, amber if
          outside. Only shows when the plan actually has macro data. */}
      {editedMeals.length > 0 && editedMeals.some((m) => m.items.some(itemHasMacros)) && (() => {
        const totals = planMacros(editedMeals)
        const fields = [
          { label: 'Calories', actual: totals.kcal, target: editedTargets.kcal, unit: 'kcal' },
          { label: 'Protein', actual: totals.protein_g, target: editedTargets.protein_g, unit: 'g' },
          { label: 'Fat', actual: totals.fat_g, target: editedTargets.fat_g, unit: 'g' },
          { label: 'Carbs', actual: totals.carbs_g, target: editedTargets.carbs_g, unit: 'g' },
        ] as const
        return (
          <div className="-mt-2">
            <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">This plan&apos;s totals · live</p>
            <div className="grid grid-cols-4 gap-3">
              {fields.map(({ label, actual, target, unit }) => {
                const status = macroComparisonStatus(actual, target)
                const colour = status === 'on' ? '#7da87d' : '#c89a6a'
                return (
                  <div key={label} className="bg-[#0e0e0e] border border-[rgba(255,255,255,0.14)] rounded-sm px-3 py-2">
                    <p className="text-xs text-[#8a8680] mb-0.5">{label}</p>
                    <p className="text-base" style={{ color: colour }}>
                      {Math.round(actual)}<span className="text-xs text-[#8a8680] ml-1">{unit}</span>
                    </p>
                    <p className="text-xs text-[#8a8680]">of {target}{unit === 'g' ? 'g' : ''}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Macro rescale — keep the same meals, adjust portions to fit new
          macros. Result lands in pendingRescale for explicit review. Only
          useful when there are existing meals to rescale. */}
      {editing && editedMeals.length > 0 && (
        <div className="border border-[rgba(255,255,255,0.14)] rounded-sm p-4 bg-[rgba(200,154,106,0.04)]">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#c89a6a] tracking-widest uppercase mb-1">Rescale meals to new macros</p>
              <p className="text-xs text-[#8a8680] italic leading-relaxed">
                Changed the calories or macros above? This keeps the same meals (same dishes, brands, prep) and asks the AI to adjust the portion sizes so daily totals hit the new targets. You review the proposal before it&apos;s applied.
              </p>
            </div>
            <Button size="sm" variant="outline" loading={rescaleBusy} onClick={rescaleMealsToTargets}>
              {pendingRescale ? 'Re-do rescale' : 'Rescale meals'}
            </Button>
          </div>

          {pendingRescale && (
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.14)]">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <p className="text-xs text-[#7da87d] tracking-widest uppercase">Rescaled proposal · review</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={discardRescale}>Discard</Button>
                  <Button size="sm" onClick={acceptRescale}>Apply to plan</Button>
                </div>
              </div>
              <p className="text-xs text-[#b8b4ac] leading-relaxed mb-2">
                {pendingRescale.meals.length} meal{pendingRescale.meals.length === 1 ? '' : 's'} re-portioned to hit {editedTargets.kcal} kcal · {editedTargets.protein_g}g P · {editedTargets.fat_g}g F · {editedTargets.carbs_g}g C.
              </p>
              <ul className="flex flex-col gap-1 text-xs text-[#c8c4bc]">
                {pendingRescale.meals.map((m, i) => (
                  <li key={i}>
                    <span className="text-[#f0ece4]">{m.name}</span>
                    <span className="text-[#b8b4ac] mx-1">·</span>
                    {m.items.length} item{m.items.length === 1 ? '' : 's'} — {m.items.map((it) => it.food).join(', ').slice(0, 120)}{m.items.map((it) => it.food).join(', ').length > 120 ? '…' : ''}
                  </li>
                ))}
              </ul>
              {pendingRescale.coach_notes && pendingRescale.coach_notes !== coachNotes && (
                <p className="text-xs text-[#8a8680] italic leading-relaxed mt-3">
                  <span className="text-[#b8b4ac]">AI note on the rescale:</span> {pendingRescale.coach_notes}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI macro recommendation — uses the latest 2 check-ins + goal to
          suggest new targets with reasoning. Visible in edit mode only. */}
      {editing && (
        <div className="border border-[rgba(255,255,255,0.14)] rounded-sm p-4 bg-[rgba(125,168,125,0.04)]">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
            <div>
              <p className="text-xs text-[#7da87d] tracking-widest uppercase mb-1">AI macro recommendation</p>
              <p className="text-xs text-[#8a8680] italic leading-relaxed">
                Asks the AI to read the latest check-in (and the one before for direction of travel) and suggest new targets — with reasoning grounded in the data so you can decide if it&apos;s the right call.
              </p>
            </div>
            <Button size="sm" variant="outline" loading={macroRecBusy} onClick={getMacroRecommendation}>
              {macroRec ? 'Regenerate' : 'Get recommendation'}
            </Button>
          </div>

          {macroRecError && (
            <p className="text-xs text-[#b06060] mt-3">{macroRecError}</p>
          )}

          {macroRec && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2">
                {([
                  { key: 'kcal',      label: 'Calories', unit: 'kcal' },
                  { key: 'protein_g', label: 'Protein',  unit: 'g' },
                  { key: 'fat_g',     label: 'Fat',      unit: 'g' },
                  { key: 'carbs_g',   label: 'Carbs',    unit: 'g' },
                ] as const).map(({ key, label, unit }) => {
                  const cur = editedTargets[key]
                  const next = macroRec.recommendation[key]
                  const diff = next - cur
                  const arrow = diff === 0 ? '→' : diff > 0 ? '↑' : '↓'
                  const arrowColor = diff === 0 ? '#8a8680' : diff > 0 ? '#7da87d' : '#c89a6a'
                  return (
                    <div key={key} className="border border-[rgba(255,255,255,0.10)] rounded-sm p-2.5 bg-[#0e0e0e]">
                      <p className="text-[10px] text-[#8a8680] tracking-widest uppercase mb-1">{label}</p>
                      <p className="text-xs text-[#8a8680]">{cur}{unit}</p>
                      <p className="text-base text-[#f0ece4] mt-0.5">
                        <span style={{ color: arrowColor }}>{arrow}</span> {next}<span className="text-xs text-[#b8b4ac] ml-0.5">{unit}</span>
                      </p>
                      {diff !== 0 && (
                        <p className="text-[10px] text-[#8a8680] mt-0.5">{diff > 0 ? '+' : ''}{diff}{unit}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="border-l-2 border-[#7da87d] pl-3 py-1">
                <p className="text-xs text-[#7da87d] tracking-wider uppercase mb-1">
                  Why this — confidence {macroRec.confidence}
                </p>
                <p className="text-sm text-[#e0d8cc] leading-relaxed">{macroRec.reasoning}</p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setMacroRec(null)}>Dismiss</Button>
                <Button size="sm" onClick={applyMacroRecommendation}>Apply to targets</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meals */}
      {editedMeals.length === 0 && !editing && (
        <div className="text-center py-16 text-[#b8b4ac] text-sm">
          No meal plan yet. Use &ldquo;AI draft new version&rdquo; or &ldquo;Edit&rdquo; to create one.
        </div>
      )}

      {editedMeals.map((meal, mealIdx) => (
        <Card key={mealIdx}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <span className="text-sm font-medium text-[#f0ece4]">{meal.name}</span>
                <span className="text-xs text-[#c89a6a]">{meal.time}</span>
                {meal.items.some(itemHasMacros) && (
                  <span className="text-xs text-[#8a8680]">{formatMacrosShort(mealMacros(meal))}</span>
                )}
              </div>
              {editing && (
                <Button size="sm" variant="ghost" onClick={() => setEditingMealIdx(editingMealIdx === mealIdx ? null : mealIdx)}>
                  {editingMealIdx === mealIdx ? 'Done' : 'Edit'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {editing && editingMealIdx === mealIdx ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-[#b8b4ac] mb-1">Meal name</p>
                    <input
                      className="input-underline text-sm"
                      value={meal.name}
                      onChange={(e) =>
                        setEditedMeals((meals) => {
                          const updated = [...meals]
                          updated[mealIdx] = { ...updated[mealIdx], name: e.target.value }
                          return updated
                        })
                      }
                    />
                  </div>
                  <div>
                    <p className="text-xs text-[#b8b4ac] mb-1">Time</p>
                    <input
                      className="input-underline text-sm"
                      value={meal.time}
                      onChange={(e) =>
                        setEditedMeals((meals) => {
                          const updated = [...meals]
                          updated[mealIdx] = { ...updated[mealIdx], time: e.target.value }
                          return updated
                        })
                      }
                    />
                  </div>
                </div>
                {meal.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex flex-col gap-1 mb-2 pb-2 border-b border-[rgba(255,255,255,0.06)] last:border-b-0">
                    <div className="grid grid-cols-[70px_70px_1fr_auto] gap-2 items-center">
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        className="input-underline text-sm"
                        value={item.quantity ?? ''}
                        onChange={(e) => updateMealItemQuantity(mealIdx, itemIdx, e.target.value)}
                        placeholder="Qty"
                      />
                      <select
                        className="input-underline text-sm bg-transparent"
                        value={item.unit ?? 'g'}
                        onChange={(e) => updateMealItemUnit(mealIdx, itemIdx, e.target.value as MealItem['unit'])}
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u} className="bg-[#0e0e0e]">{u}</option>
                        ))}
                      </select>
                      <input
                        className="input-underline text-sm"
                        value={item.food}
                        onChange={(e) => updateMealItemField(mealIdx, itemIdx, 'food', e.target.value)}
                        placeholder="Food (e.g. rolled oats)"
                      />
                      <button
                        className="text-[#b8b4ac] hover:text-[#b06060] transition-colors p-1"
                        onClick={() => removeMealItem(mealIdx, itemIdx)}
                        aria-label="Remove item"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                          <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                    <input
                      className="input-underline text-xs"
                      value={item.brand ?? ''}
                      onChange={(e) => updateMealItemField(mealIdx, itemIdx, 'brand', e.target.value)}
                      placeholder="Brand suggestion (optional)"
                    />
                    {itemHasMacros(item) && (
                      <p className="text-xs text-[#8a8680] pl-1">{formatMacrosShort(itemMacros(item))}</p>
                    )}
                  </div>
                ))}
                <button
                  className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] text-left transition-colors mt-1"
                  onClick={() => addMealItem(mealIdx)}
                >
                  + Add item
                </button>
                <div className="mt-3">
                  <p className="text-xs text-[#b8b4ac] mb-1">Prep notes</p>
                  <textarea
                    className="input-underline text-sm"
                    rows={2}
                    value={meal.prep_notes ?? ''}
                    placeholder="How to prepare — 1–3 sentences. Cooking method, timings, assembly."
                    onChange={(e) => updateMealPrep(mealIdx, e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <ul className="flex flex-col gap-2">
                  {meal.items.map((item, i) => (
                    <li key={i} className="text-sm text-[#e0d8cc]">
                      <div className="flex items-start gap-2">
                        <span className="text-[#b8b4ac] mt-0.5">·</span>
                        <span className="flex-1">{formatItemDisplay(item)}</span>
                        {item.brand && (
                          <span className="text-xs text-[#8a8680] italic text-right whitespace-nowrap">{item.brand}</span>
                        )}
                      </div>
                      {itemHasMacros(item) && (
                        <p className="text-xs text-[#8a8680] ml-4">{formatMacrosShort(itemMacros(item))}</p>
                      )}
                    </li>
                  ))}
                </ul>
                {meal.prep_notes && meal.prep_notes.trim().length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.08)]">
                    <p className="text-xs text-[#b8b4ac] tracking-wider uppercase mb-1">Prep</p>
                    <p className="text-sm text-[#c8c4bc] leading-relaxed italic">{meal.prep_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Alternative meal options — generated by the AI, editable in edit mode. */}
            {(meal.alternatives && meal.alternatives.length > 0) || editing ? (
              <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.10)]">
                <p className="text-xs text-[#b8b4ac] tracking-wider uppercase mb-2">Alternative options · same macros</p>
                <div className="flex flex-col gap-3">
                  {(meal.alternatives ?? []).map((alt, altIdx) => (
                    <div key={altIdx} className="border-l-2 border-[rgba(255,255,255,0.10)] pl-3">
                      {editing ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              className="input-underline text-xs flex-1"
                              value={alt.label}
                              placeholder="Alternative label (e.g. Higher-carb training day)"
                              onChange={(e) => setEditedMeals((meals) => {
                                const u = [...meals]
                                const alts = [...(u[mealIdx].alternatives ?? [])]
                                alts[altIdx] = { ...alts[altIdx], label: e.target.value }
                                u[mealIdx] = { ...u[mealIdx], alternatives: alts }
                                return u
                              })}
                            />
                            <button
                              className="text-[#b8b4ac] hover:text-[#b06060] transition-colors"
                              onClick={() => setEditedMeals((meals) => {
                                const u = [...meals]
                                const alts = (u[mealIdx].alternatives ?? []).filter((_, j) => j !== altIdx)
                                u[mealIdx] = { ...u[mealIdx], alternatives: alts }
                                return u
                              })}
                              title="Remove alternative"
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" /></svg>
                            </button>
                          </div>
                          {alt.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                              <input
                                className="input-underline text-xs"
                                value={item.food}
                                placeholder="e.g. 170g Skyr"
                                onChange={(e) => setEditedMeals((meals) => {
                                  const u = [...meals]
                                  const alts = [...(u[mealIdx].alternatives ?? [])]
                                  const items = [...alts[altIdx].items]
                                  items[itemIdx] = { ...items[itemIdx], food: e.target.value }
                                  alts[altIdx] = { ...alts[altIdx], items }
                                  u[mealIdx] = { ...u[mealIdx], alternatives: alts }
                                  return u
                                })}
                              />
                              <input
                                className="input-underline text-xs"
                                value={item.brand ?? ''}
                                placeholder="Brand (optional)"
                                onChange={(e) => setEditedMeals((meals) => {
                                  const u = [...meals]
                                  const alts = [...(u[mealIdx].alternatives ?? [])]
                                  const items = [...alts[altIdx].items]
                                  items[itemIdx] = { ...items[itemIdx], brand: e.target.value }
                                  alts[altIdx] = { ...alts[altIdx], items }
                                  u[mealIdx] = { ...u[mealIdx], alternatives: alts }
                                  return u
                                })}
                              />
                              <button
                                className="text-[#b8b4ac] hover:text-[#b06060] transition-colors p-1"
                                onClick={() => setEditedMeals((meals) => {
                                  const u = [...meals]
                                  const alts = [...(u[mealIdx].alternatives ?? [])]
                                  const items = alts[altIdx].items.filter((_, j) => j !== itemIdx)
                                  alts[altIdx] = { ...alts[altIdx], items }
                                  u[mealIdx] = { ...u[mealIdx], alternatives: alts }
                                  return u
                                })}
                                aria-label="Remove item"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" /></svg>
                              </button>
                            </div>
                          ))}
                          <button
                            className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] text-left transition-colors"
                            onClick={() => setEditedMeals((meals) => {
                              const u = [...meals]
                              const alts = [...(u[mealIdx].alternatives ?? [])]
                              alts[altIdx] = { ...alts[altIdx], items: [...alts[altIdx].items, { food: '', brand: '', quantity: undefined, unit: 'g' }] }
                              u[mealIdx] = { ...u[mealIdx], alternatives: alts }
                              return u
                            })}
                          >
                            + Add item to this alternative
                          </button>
                          <textarea
                            className="input-underline text-xs mt-1"
                            rows={2}
                            value={alt.prep_notes ?? ''}
                            placeholder="Prep notes for this alternative"
                            onChange={(e) => setEditedMeals((meals) => {
                              const u = [...meals]
                              const alts = [...(u[mealIdx].alternatives ?? [])]
                              alts[altIdx] = { ...alts[altIdx], prep_notes: e.target.value }
                              u[mealIdx] = { ...u[mealIdx], alternatives: alts }
                              return u
                            })}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
                            <p className="text-xs text-[#c89a6a] tracking-wider uppercase">{alt.label}</p>
                            {alt.items.some(itemHasMacros) && (
                              <span className="text-xs text-[#8a8680]">{formatMacrosShort(mealMacros({ ...alt, name: '', time: '' }))}</span>
                            )}
                          </div>
                          <ul className="flex flex-col gap-0.5">
                            {alt.items.map((item, i) => (
                              <li key={i} className="text-xs text-[#b8b4ac] flex items-start gap-2">
                                <span className="text-[#8a8680] mt-0.5">·</span>
                                <span className="flex-1">{formatItemDisplay(item)}</span>
                                {item.brand && <span className="text-[#8a8680] italic text-right whitespace-nowrap">{item.brand}</span>}
                              </li>
                            ))}
                          </ul>
                          {alt.prep_notes && alt.prep_notes.trim().length > 0 && (
                            <p className="text-xs text-[#8a8680] italic leading-relaxed mt-1">{alt.prep_notes}</p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {editing && (
                    <button
                      className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] text-left transition-colors"
                      onClick={() => setEditedMeals((meals) => {
                        const u = [...meals]
                        const alts = [...(u[mealIdx].alternatives ?? []), { label: '', items: [{ food: '', brand: '', quantity: undefined, unit: 'g' as MealItem['unit'] }] }]
                        u[mealIdx] = { ...u[mealIdx], alternatives: alts }
                        return u
                      })}
                    >
                      + Add alternative option
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Per-meal AI proposal flow — only in edit mode. Optional
                instructions sharpen the request. Result lands in
                pendingMeals[mealIdx] for explicit accept/discard rather
                than silently overwriting the current meal. */}
            {editing && (
              <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.10)]">
                <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">Ask AI to change this meal</p>
                <textarea
                  className="input-underline text-sm w-full"
                  rows={2}
                  value={mealInstructions[mealIdx] ?? ''}
                  placeholder={'Optional. e.g. "swap chicken for tofu", "make it quicker to prep", "more carbs for training day"'}
                  onChange={(e) => setMealInstructions((m) => ({ ...m, [mealIdx]: e.target.value }))}
                />
                <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
                  <p className="text-xs text-[#8a8680] italic leading-relaxed flex-1 min-w-0">
                    Leave the box blank for a fresh take. The AI keeps your dislikes / allergies / macros in mind either way.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={regeneratingIdx === mealIdx}
                    onClick={() => proposeMealChange(mealIdx)}
                  >
                    Propose new version
                  </Button>
                </div>
              </div>
            )}

            {/* Pending proposal preview — accept moves it into editedMeals,
                discard throws it away. Either way the change is opt-in. */}
            {pendingMeals[mealIdx] && (
              <div className="mt-4 border border-[#7da87d] rounded-sm bg-[rgba(125,168,125,0.05)] p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <p className="text-xs text-[#7da87d] tracking-widest uppercase">AI-proposed version · review</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => discardMealProposal(mealIdx)}>
                      Discard
                    </Button>
                    <Button size="sm" onClick={() => acceptMealProposal(mealIdx)}>
                      Accept change
                    </Button>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 mb-3">
                  {pendingMeals[mealIdx].items.map((item, i) => (
                    <li key={i} className="text-sm text-[#e0d8cc]">
                      <div className="flex items-start gap-2">
                        <span className="text-[#b8b4ac] mt-0.5">·</span>
                        <span className="flex-1">{formatItemDisplay(item)}</span>
                        {item.brand && (
                          <span className="text-xs text-[#8a8680] italic text-right whitespace-nowrap">{item.brand}</span>
                        )}
                      </div>
                      {itemHasMacros(item) && (
                        <p className="text-xs text-[#8a8680] ml-4">{formatMacrosShort(itemMacros(item))}</p>
                      )}
                    </li>
                  ))}
                </ul>
                {pendingMeals[mealIdx].items.some(itemHasMacros) && (
                  <p className="text-xs text-[#7da87d] mb-3">Total: {formatMacrosShort(mealMacros(pendingMeals[mealIdx]))}</p>
                )}
                {pendingMeals[mealIdx].prep_notes && (
                  <div className="pt-2 border-t border-[rgba(255,255,255,0.08)]">
                    <p className="text-xs text-[#b8b4ac] tracking-wider uppercase mb-1">Prep</p>
                    <p className="text-sm text-[#c8c4bc] leading-relaxed italic">{pendingMeals[mealIdx].prep_notes}</p>
                  </div>
                )}
                {(pendingMeals[mealIdx].alternatives ?? []).length > 0 && (
                  <details className="mt-3 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                    <summary className="text-xs text-[#b8b4ac] cursor-pointer hover:text-[#e0d8cc]">
                      {pendingMeals[mealIdx].alternatives!.length} alternative option{pendingMeals[mealIdx].alternatives!.length === 1 ? '' : 's'}
                    </summary>
                    <div className="mt-2 flex flex-col gap-2">
                      {pendingMeals[mealIdx].alternatives!.map((alt, i) => (
                        <div key={i} className="pl-3 border-l border-[rgba(255,255,255,0.10)]">
                          <p className="text-xs text-[#c89a6a] tracking-wider uppercase mb-1">{alt.label}</p>
                          <ul className="flex flex-col gap-0.5">
                            {alt.items.map((item, j) => (
                              <li key={j} className="text-xs text-[#b8b4ac] flex items-start gap-2">
                                <span className="text-[#8a8680] mt-0.5">·</span>
                                <span className="flex-1">{formatItemDisplay(item)}</span>
                                {item.brand && <span className="text-[#8a8680] italic">{item.brand}</span>}
                              </li>
                            ))}
                          </ul>
                          {alt.prep_notes && (
                            <p className="text-xs text-[#8a8680] italic leading-relaxed mt-1">{alt.prep_notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      ))}

      {/* Food facts — short, sourced one-liners from the AI dietitian */}
      {foodFacts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Food facts · evidence-based</span>
              {editing && (
                <button
                  className="text-xs text-[#8a8680] hover:text-[#e0d8cc] transition-colors"
                  onClick={() => setFoodFacts([])}
                >
                  Clear all
                </button>
              )}
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {foodFacts.map((f, i) => (
              <div key={i} className="border-l border-[rgba(255,255,255,0.14)] pl-3">
                {editing ? (
                  <div className="flex flex-col gap-1.5">
                    <input
                      className="input-underline text-sm"
                      value={f.food}
                      placeholder="Food"
                      onChange={(e) => setFoodFacts((arr) => arr.map((x, j) => j === i ? { ...x, food: e.target.value } : x))}
                    />
                    <textarea
                      className="input-underline text-sm"
                      rows={2}
                      value={f.fact}
                      placeholder="Evidence-based fact"
                      onChange={(e) => setFoodFacts((arr) => arr.map((x, j) => j === i ? { ...x, fact: e.target.value } : x))}
                    />
                    <input
                      className="input-underline text-xs"
                      value={f.source}
                      placeholder="Source (e.g. BDA Food Fact Sheet — Calcium)"
                      onChange={(e) => setFoodFacts((arr) => arr.map((x, j) => j === i ? { ...x, source: e.target.value } : x))}
                    />
                    <button
                      className="text-xs text-[#b8b4ac] hover:text-[#b06060] self-start mt-0.5 transition-colors"
                      onClick={() => setFoodFacts((arr) => arr.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[#f0ece4] mb-0.5"><span className="text-[#c89a6a]">{f.food}</span> — {f.fact}</p>
                    <p className="text-xs text-[#8a8680] italic">{f.source}</p>
                  </>
                )}
              </div>
            ))}
            {editing && (
              <button
                className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] text-left transition-colors"
                onClick={() => setFoodFacts((arr) => [...arr, { food: '', fact: '', source: '' }])}
              >
                + Add fact
              </button>
            )}
          </CardBody>
        </Card>
      )}

      {/* Coach notes */}
      {(editing || coachNotes) && (
        <Card>
          <CardBody>
            <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">Coach notes</p>
            {editing ? (
              <textarea
                className="input-underline text-sm"
                rows={3}
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder="Optional notes about this plan..."
              />
            ) : (
              <p className="text-sm text-[#e0d8cc] leading-relaxed italic">{coachNotes}</p>
            )}
          </CardBody>
        </Card>
      )}

      {error && <p className="text-sm text-[#b06060]">{error}</p>}

      {/* AI disclaimer */}
      <p className="text-xs text-[#8a8680] leading-relaxed">
        AI suggests meals using clinically approved nutritional research — you always edit and approve before saving.
      </p>

      {/* Action row */}
      {editing && (
        <div className="flex gap-3 pt-2">
          <Button onClick={saveDraft} loading={saving}>
            Save draft
          </Button>
          <Button variant="ghost" onClick={() => { setEditing(false); setEditingMealIdx(null) }}>
            Discard changes
          </Button>
        </div>
      )}
    </div>
  )
}

function PrefRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#b8b4ac] tracking-wider uppercase mb-0.5">{label}</p>
      <p className="text-sm text-[#e0d8cc]">{value}</p>
    </div>
  )
}
