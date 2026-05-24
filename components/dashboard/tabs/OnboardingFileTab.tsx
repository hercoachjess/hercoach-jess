'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardHeader, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import type { OnboardingPayload, OnboardingSubmission } from '@/types'

interface Props {
  onboarding: OnboardingSubmission | null
}

export default function OnboardingFileTab({ onboarding }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [editPayload, setEditPayload] = useState<OnboardingPayload | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  if (!onboarding) {
    return (
      <div className="text-center py-20 text-[#b8b4ac] text-sm">
        No onboarding submission on record.
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = onboarding.payload ?? {}
  const b = p.basics ?? {}
  const g = p.goals ?? {}
  const l = p.lifestyle ?? {}
  const f = p.food_preferences ?? {}
  const h = p.health_screening ?? {}
  const a = p.acknowledgements ?? {}

  const list = (arr?: string[]) => (arr && arr.length ? arr.join(', ') : '—')

  function openEdit() {
    setEditPayload(structuredClone(onboarding!.payload) as OnboardingPayload)
    setEditing(true)
    setEditError('')
  }

  async function saveEdit() {
    if (!editPayload) return
    setSaving(true); setEditError('')
    const supabase = createClient()
    // Update the onboarding submission payload. The signed_name + signed_date
    // are deliberately untouched — they are the client's electronic signature
    // and the legal record.
    const { error: e } = await supabase
      .from('onboarding_submissions')
      .update({ payload: editPayload })
      .eq('id', onboarding!.id)
    if (e) { setSaving(false); setEditError(e.message); return }

    // Mirror name + goal back to the client row so dashboard / client header stay in sync.
    const clientUpdates: Record<string, unknown> = {}
    if (editPayload.basics?.first_name) clientUpdates.full_name = editPayload.basics.first_name
    if (editPayload.basics?.email) clientUpdates.email = editPayload.basics.email
    if (editPayload.basics?.phone != null) clientUpdates.phone = editPayload.basics.phone
    if (editPayload.basics?.current_weight_kg) clientUpdates.current_weight_kg = parseFloat(editPayload.basics.current_weight_kg)
    if (editPayload.basics?.height_cm) clientUpdates.height_cm = parseFloat(editPayload.basics.height_cm)
    if (editPayload.goals?.primary_goal) clientUpdates.goal = editPayload.goals.primary_goal
    if (Object.keys(clientUpdates).length > 0) {
      await supabase.from('clients').update(clientUpdates).eq('id', onboarding!.client_id)
    }

    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={openEdit}>
          Edit onboarding answers
        </Button>
      </div>
      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Basics</span></CardHeader>
        <CardBody className="grid grid-cols-2 gap-3">
          <Row label="First name" value={b.first_name || '—'} />
          <Row label="Age" value={b.age || '—'} />
          <Row label="Email" value={b.email || '—'} />
          <Row label="Phone" value={b.phone || '—'} />
          <Row label="Current weight" value={b.current_weight_kg ? `${b.current_weight_kg} kg` : '—'} />
          <Row label="Height" value={b.height_cm ? `${b.height_cm} cm` : '—'} />
          <Row label="Goal weight" value={b.goal_weight_kg ? `${b.goal_weight_kg} kg` : '—'} />
          <Row label="City / Town" value={b.city || '—'} />
          <Row label="GP Surgery" value={b.gp_surgery || '—'} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Goals</span></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Row label="Primary goal" value={g.primary_goal || '—'} />
          <Row label="Timeline" value={g.timeline || '—'} />
          <Row label="Why it matters" value={g.why || '—'} multiline />
          <Row label="Previous experience" value={g.previous || '—'} multiline />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Lifestyle</span></CardHeader>
        <CardBody className="grid grid-cols-2 gap-3">
          <Row label="Activity level" value={l.activity || '—'} />
          <Row label="Training experience" value={l.experience || '—'} />
          <Row label="Days / week" value={l.training_days_per_week || '—'} />
          <Row label="Session length" value={l.session_length || '—'} />
          <Row label="Training location" value={l.training_location || '—'} />
          <Row label="Job / Routine" value={l.job || '—'} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Food & nutrition</span></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Row label="Diet type" value={f.diet_type || '—'} />
          <Row label="Meals per day" value={f.meals_per_day || '—'} />
          <Row label="Cooking confidence" value={f.cooking_confidence || '—'} />
          <Row label="Meal prep" value={f.meal_prep || '—'} />
          <Row label="Foods loved" value={f.foods_loved || '—'} multiline />
          <Row label="Foods disliked" value={f.foods_disliked || '—'} multiline />
          <Row label="Allergies / intolerances" value={f.allergies || '—'} />
          <Row label="Supplements" value={f.supplements || '—'} />
          <Row label="Current eating pattern" value={f.eating_pattern || '—'} multiline />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Health — physical</span></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Row label="Injuries / limitations" value={h.injuries || '—'} multiline />
          <Row label="Diagnosed conditions" value={list(h.conditions)} />
          <Row label="Medications" value={h.medications || '—'} multiline />
          <Row label="Pregnancy / TTC" value={h.pregnancy || '—'} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Health — mental & food relationship</span></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Row label="Mental health" value={h.mental_health || '—'} />
          <Row label="Food relationship" value={h.food_relationship || '—'} />
          <Row label="ED history" value={list(h.ed_history)} />
          <Row label="Mental health notes" value={h.mh_notes || '—'} multiline />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Wellbeing</span></CardHeader>
        <CardBody className="grid grid-cols-2 gap-3">
          <Row label="Sleep quality" value={h.sleep || '—'} />
          <Row label="Stress level" value={h.stress_level || '—'} />
          <Row label="Water intake" value={h.water_intake || '—'} />
          <Row label="Alcohol" value={h.alcohol || '—'} />
          <Row label="Other notes" value={h.other_health || '—'} multiline />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Declaration</span></CardHeader>
        <CardBody className="grid grid-cols-2 gap-3">
          <Row label="Scope of practice" value={a.scope ? 'Accepted' : '—'} />
          <Row label="Referral rights" value={a.referral ? 'Accepted' : '—'} />
          <Row label="Health declaration" value={a.health ? 'Accepted' : '—'} />
          <Row label="Liability" value={a.liability ? 'Accepted' : '—'} />
          <Row label="Payment terms" value={a.payment ? 'Accepted' : '—'} />
          <Row label="Cancellation" value={a.cancellation ? 'Accepted' : '—'} />
          <Row label="Data & privacy" value={a.data ? 'Accepted' : '—'} />
          <Row label="Age 18+ & agreement" value={a.age ? 'Accepted' : '—'} />
          <Row label="Signed name" value={onboarding.signed_name || '—'} />
          <Row label="Signed date" value={onboarding.signed_date || '—'} />
          <Row label="Submitted" value={new Date(onboarding.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
        </CardBody>
      </Card>

      {/* Edit onboarding modal — preserves the signed declaration */}
      <Modal
        open={editing && !!editPayload}
        onClose={() => { setEditing(false); setEditPayload(null); setEditError('') }}
        title="Edit onboarding answers"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setEditing(false); setEditPayload(null); setEditError('') }}>Cancel</Button>
            <Button onClick={saveEdit} loading={saving}>Save changes</Button>
          </>
        }
      >
        {editPayload && (
          <div className="flex flex-col gap-6">
            <p className="text-xs text-[#8a8680] italic leading-relaxed">
              The signed declaration (name + date) is the client&apos;s electronic signature and is preserved unchanged. Everything else is editable when a client tells you they made a mistake.
            </p>

            <EditSection title="Basics">
              <Grid2>
                <EditField label="First name" value={editPayload.basics.first_name} onChange={(v) => setEditPayload({ ...editPayload, basics: { ...editPayload.basics, first_name: v } })} />
                <EditField label="Age" value={editPayload.basics.age} onChange={(v) => setEditPayload({ ...editPayload, basics: { ...editPayload.basics, age: v } })} />
                <EditField label="Email" value={editPayload.basics.email} onChange={(v) => setEditPayload({ ...editPayload, basics: { ...editPayload.basics, email: v } })} />
                <EditField label="Phone" value={editPayload.basics.phone} onChange={(v) => setEditPayload({ ...editPayload, basics: { ...editPayload.basics, phone: v } })} />
                <EditField label="Current weight (kg)" value={editPayload.basics.current_weight_kg} onChange={(v) => setEditPayload({ ...editPayload, basics: { ...editPayload.basics, current_weight_kg: v } })} />
                <EditField label="Height (cm)" value={editPayload.basics.height_cm} onChange={(v) => setEditPayload({ ...editPayload, basics: { ...editPayload.basics, height_cm: v } })} />
                <EditField label="Goal weight (kg)" value={editPayload.basics.goal_weight_kg} onChange={(v) => setEditPayload({ ...editPayload, basics: { ...editPayload.basics, goal_weight_kg: v } })} />
                <EditField label="City / Town" value={editPayload.basics.city} onChange={(v) => setEditPayload({ ...editPayload, basics: { ...editPayload.basics, city: v } })} />
                <EditField label="GP Surgery" value={editPayload.basics.gp_surgery} onChange={(v) => setEditPayload({ ...editPayload, basics: { ...editPayload.basics, gp_surgery: v } })} />
              </Grid2>
            </EditSection>

            <EditSection title="Goals">
              <EditField label="Primary goal" value={editPayload.goals.primary_goal} onChange={(v) => setEditPayload({ ...editPayload, goals: { ...editPayload.goals, primary_goal: v } })} />
              <EditField label="Timeline" value={editPayload.goals.timeline} onChange={(v) => setEditPayload({ ...editPayload, goals: { ...editPayload.goals, timeline: v } })} />
              <EditField label="Why it matters" value={editPayload.goals.why} onChange={(v) => setEditPayload({ ...editPayload, goals: { ...editPayload.goals, why: v } })} long />
              <EditField label="Previous experience" value={editPayload.goals.previous} onChange={(v) => setEditPayload({ ...editPayload, goals: { ...editPayload.goals, previous: v } })} long />
            </EditSection>

            <EditSection title="Lifestyle">
              <Grid2>
                <EditField label="Activity level" value={editPayload.lifestyle.activity} onChange={(v) => setEditPayload({ ...editPayload, lifestyle: { ...editPayload.lifestyle, activity: v } })} />
                <EditField label="Training experience" value={editPayload.lifestyle.experience} onChange={(v) => setEditPayload({ ...editPayload, lifestyle: { ...editPayload.lifestyle, experience: v } })} />
                <EditField label="Days / week" value={editPayload.lifestyle.training_days_per_week} onChange={(v) => setEditPayload({ ...editPayload, lifestyle: { ...editPayload.lifestyle, training_days_per_week: v } })} />
                <EditField label="Session length" value={editPayload.lifestyle.session_length} onChange={(v) => setEditPayload({ ...editPayload, lifestyle: { ...editPayload.lifestyle, session_length: v } })} />
                <EditField label="Training location" value={editPayload.lifestyle.training_location} onChange={(v) => setEditPayload({ ...editPayload, lifestyle: { ...editPayload.lifestyle, training_location: v } })} />
                <EditField label="Job / routine" value={editPayload.lifestyle.job} onChange={(v) => setEditPayload({ ...editPayload, lifestyle: { ...editPayload.lifestyle, job: v } })} />
              </Grid2>
            </EditSection>

            <EditSection title="Food & nutrition">
              <Grid2>
                <EditField label="Diet type" value={editPayload.food_preferences.diet_type} onChange={(v) => setEditPayload({ ...editPayload, food_preferences: { ...editPayload.food_preferences, diet_type: v } })} />
                <EditField label="Meals per day" value={editPayload.food_preferences.meals_per_day} onChange={(v) => setEditPayload({ ...editPayload, food_preferences: { ...editPayload.food_preferences, meals_per_day: v } })} />
                <EditField label="Cooking confidence" value={editPayload.food_preferences.cooking_confidence} onChange={(v) => setEditPayload({ ...editPayload, food_preferences: { ...editPayload.food_preferences, cooking_confidence: v } })} />
                <EditField label="Meal prep" value={editPayload.food_preferences.meal_prep} onChange={(v) => setEditPayload({ ...editPayload, food_preferences: { ...editPayload.food_preferences, meal_prep: v } })} />
              </Grid2>
              <EditField label="Foods loved" value={editPayload.food_preferences.foods_loved} onChange={(v) => setEditPayload({ ...editPayload, food_preferences: { ...editPayload.food_preferences, foods_loved: v } })} long />
              <EditField label="Foods disliked" value={editPayload.food_preferences.foods_disliked} onChange={(v) => setEditPayload({ ...editPayload, food_preferences: { ...editPayload.food_preferences, foods_disliked: v } })} long />
              <EditField label="Allergies / intolerances" value={editPayload.food_preferences.allergies} onChange={(v) => setEditPayload({ ...editPayload, food_preferences: { ...editPayload.food_preferences, allergies: v } })} long />
              <EditField label="Supplements" value={editPayload.food_preferences.supplements} onChange={(v) => setEditPayload({ ...editPayload, food_preferences: { ...editPayload.food_preferences, supplements: v } })} />
              <EditField label="Current eating pattern" value={editPayload.food_preferences.eating_pattern} onChange={(v) => setEditPayload({ ...editPayload, food_preferences: { ...editPayload.food_preferences, eating_pattern: v } })} long />
            </EditSection>

            <EditSection title="Health screening — physical">
              <EditField label="Injuries / limitations" value={editPayload.health_screening.injuries} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, injuries: v } })} long />
              <EditField label="Medications" value={editPayload.health_screening.medications} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, medications: v } })} long />
              <EditField label="Pregnancy / TTC" value={editPayload.health_screening.pregnancy} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, pregnancy: v } })} />
              <EditField
                label="Diagnosed conditions (comma-separated)"
                value={(editPayload.health_screening.conditions ?? []).join(', ')}
                onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, conditions: v.split(',').map((s) => s.trim()).filter(Boolean) } })}
              />
            </EditSection>

            <EditSection title="Health screening — mental & relationship with food">
              <Grid2>
                <EditField label="Mental health" value={editPayload.health_screening.mental_health} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, mental_health: v } })} />
                <EditField label="Food relationship" value={editPayload.health_screening.food_relationship} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, food_relationship: v } })} />
              </Grid2>
              <EditField
                label="ED history (comma-separated)"
                value={(editPayload.health_screening.ed_history ?? []).join(', ')}
                onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, ed_history: v.split(',').map((s) => s.trim()).filter(Boolean) } })}
              />
              <EditField label="Mental health notes" value={editPayload.health_screening.mh_notes} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, mh_notes: v } })} long />
            </EditSection>

            <EditSection title="Wellbeing">
              <Grid2>
                <EditField label="Sleep quality" value={editPayload.health_screening.sleep} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, sleep: v } })} />
                <EditField label="Stress level" value={editPayload.health_screening.stress_level} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, stress_level: v } })} />
                <EditField label="Water intake" value={editPayload.health_screening.water_intake} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, water_intake: v } })} />
                <EditField label="Alcohol" value={editPayload.health_screening.alcohol} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, alcohol: v } })} />
              </Grid2>
              <EditField label="Other health notes" value={editPayload.health_screening.other_health} onChange={(v) => setEditPayload({ ...editPayload, health_screening: { ...editPayload.health_screening, other_health: v } })} long />
            </EditSection>

            {editError && <p className="text-sm text-[#b06060]">{editError}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-2 border-t border-[rgba(255,255,255,0.10)] first:border-0 first:pt-0">
      <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-3">{title}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">{children}</div>
}

function EditField({ label, value, onChange, long }: { label: string; value: string; onChange: (v: string) => void; long?: boolean }) {
  return (
    <div>
      <label className="text-xs text-[#b8b4ac] block mb-1">{label}</label>
      {long ? (
        <textarea
          className="input-underline text-sm"
          rows={2}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="input-underline text-sm"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={multiline ? 'flex flex-col gap-0.5' : 'flex items-start justify-between gap-4'}>
      <span className="text-xs text-[#b8b4ac] flex-shrink-0">{label}</span>
      <span className={`text-sm text-[#e0d8cc] ${multiline ? '' : 'text-right'} leading-relaxed`}>
        {value}
      </span>
    </div>
  )
}
