'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Client, MealPlan, Meal } from '@/types'

interface Props {
  client: Client
  initialMealPlan: MealPlan | null
}

export default function MealPlanTab({ client, initialMealPlan }: Props) {
  const router = useRouter()
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(initialMealPlan)
  const [editing, setEditing] = useState(false)
  const [editingMealIdx, setEditingMealIdx] = useState<number | null>(null)
  const [aiDrafting, setAiDrafting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Local editable state
  const [editedMeals, setEditedMeals] = useState<Meal[]>(mealPlan?.meals ?? [])
  const [editedTargets, setEditedTargets] = useState(
    mealPlan?.targets ?? {
      kcal: client.primary_goal_kcal ?? 2000,
      protein_g: client.protein_target_g ?? 150,
      fat_g: client.fat_target_g ?? 70,
      carbs_g: client.carbs_target_g ?? 200,
    }
  )
  const [coachNotes, setCoachNotes] = useState(mealPlan?.coach_notes ?? '')

  async function aiDraft() {
    setAiDrafting(true)
    setError('')
    try {
      const res = await fetch('/api/ai/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.full_name,
          goal: client.goal || '',
          targets: editedTargets,
          foodPreferences: '',
          allergies: '',
          dislikes: '',
          cookingAbility: '',
          mealsPerDay: 4,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditedMeals(data.meals)
      if (data.coach_notes) setCoachNotes(data.coach_notes)
      setEditing(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI draft failed.')
    } finally {
      setAiDrafting(false)
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
        coach_notes: coachNotes,
        status: 'draft',
        updated_at: now,
      }).eq('id', mealPlan.id)
    } else {
      const { data } = await supabase.from('meal_plans').insert({
        client_id: client.id,
        meals: editedMeals,
        targets: editedTargets,
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

  function updateMealItem(mealIdx: number, itemIdx: number, value: string) {
    setEditedMeals((meals) => {
      const updated = [...meals]
      const items = [...updated[mealIdx].items]
      items[itemIdx] = value
      updated[mealIdx] = { ...updated[mealIdx], items }
      return updated
    })
  }

  function addMealItem(mealIdx: number) {
    setEditedMeals((meals) => {
      const updated = [...meals]
      updated[mealIdx] = { ...updated[mealIdx], items: [...updated[mealIdx].items, ''] }
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

  return (
    <div className="flex flex-col gap-5">
      {/* Header card */}
      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#6b6764] mb-1">
              Status: <span className="text-[#c8c4bc]">{mealPlan?.status ?? 'No plan'}</span>
              {mealPlan?.updated_at && (
                <span className="ml-3">Last edited: {formatDate(mealPlan.updated_at)}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" loading={aiDrafting} onClick={aiDraft}>
              AI draft new version
            </Button>
            {mealPlan && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Targets row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: 'kcal', label: 'Calories', unit: 'kcal' },
          { key: 'protein_g', label: 'Protein', unit: 'g' },
          { key: 'fat_g', label: 'Fat', unit: 'g' },
          { key: 'carbs_g', label: 'Carbs', unit: 'g' },
        ].map(({ key, label, unit }) => (
          <Card key={key}>
            <CardBody className="py-3">
              <p className="text-xs text-[#6b6764] mb-1">{label}</p>
              {editing ? (
                <input
                  type="number"
                  className="input-underline text-lg w-full"
                  value={editedTargets[key as keyof typeof editedTargets]}
                  onChange={(e) => setEditedTargets((t) => ({ ...t, [key]: Number(e.target.value) }))}
                />
              ) : (
                <p className="text-xl text-[#f0ece4]">
                  {editedTargets[key as keyof typeof editedTargets]}<span className="text-sm text-[#6b6764] ml-1">{unit}</span>
                </p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Meals */}
      {editedMeals.length === 0 && !editing && (
        <div className="text-center py-16 text-[#6b6764] text-sm">
          No meal plan yet. Use &ldquo;AI draft new version&rdquo; or &ldquo;Edit&rdquo; to create one.
        </div>
      )}

      {editedMeals.map((meal, mealIdx) => (
        <Card key={mealIdx}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#f0ece4]">{meal.name}</span>
                <span className="text-xs text-[#c89a6a]">{meal.time}</span>
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
                    <p className="text-xs text-[#6b6764] mb-1">Meal name</p>
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
                    <p className="text-xs text-[#6b6764] mb-1">Time</p>
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
                  <div key={itemIdx} className="flex items-center gap-2">
                    <input
                      className="input-underline text-sm flex-1"
                      value={item}
                      onChange={(e) => updateMealItem(mealIdx, itemIdx, e.target.value)}
                      placeholder="e.g. 150g chicken breast"
                    />
                    <button
                      className="text-[#6b6764] hover:text-[#b06060] transition-colors flex-shrink-0"
                      onClick={() => removeMealItem(mealIdx, itemIdx)}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  className="text-xs text-[#6b6764] hover:text-[#c8c4bc] text-left transition-colors mt-1"
                  onClick={() => addMealItem(mealIdx)}
                >
                  + Add item
                </button>
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {meal.items.map((item, i) => (
                  <li key={i} className="text-sm text-[#c8c4bc] flex items-start gap-2">
                    <span className="text-[#6b6764] mt-0.5">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ))}

      {/* Coach notes */}
      {(editing || coachNotes) && (
        <Card>
          <CardBody>
            <p className="text-xs text-[#6b6764] tracking-widest uppercase mb-2">Coach notes</p>
            {editing ? (
              <textarea
                className="input-underline text-sm"
                rows={3}
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder="Optional notes about this plan..."
              />
            ) : (
              <p className="text-sm text-[#c8c4bc] leading-relaxed italic">{coachNotes}</p>
            )}
          </CardBody>
        </Card>
      )}

      {error && <p className="text-sm text-[#b06060]">{error}</p>}

      {/* AI disclaimer */}
      <p className="text-xs text-[#4a4744] leading-relaxed">
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
