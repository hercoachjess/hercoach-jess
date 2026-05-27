'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardHeader, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import type { Client, OnboardingPayload, OnboardingSubmission } from '@/types'

interface Props {
  onboarding: OnboardingSubmission | null
  client?: Client
}

export default function OnboardingFileTab({ onboarding, client }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [editPayload, setEditPayload] = useState<OnboardingPayload | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [pdfBusy, setPdfBusy] = useState<'view' | 'share' | null>(null)
  const [pdfError, setPdfError] = useState('')
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

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

  // ── PDF: open the inline PDF in a new tab. Phones with their own PDF
  // viewer (iOS Safari, Android Chrome) handle scrolling natively, which
  // sidesteps the in-page modal scroll issue entirely.
  async function viewPdf() {
    setPdfBusy('view'); setPdfError('')
    try {
      if (!onboarding) throw new Error('No onboarding submission.')
      const res = await fetch('/api/pdf/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: onboarding.client_id, mode: 'inline' }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(j.error || 'Failed to render PDF')
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
      // Revoke after a delay so the new tab has time to load it.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch (e: unknown) {
      setPdfError(e instanceof Error ? e.message : 'Failed to open PDF.')
    } finally {
      setPdfBusy(null)
    }
  }

  // ── PDF: upload to storage so we have a shareable URL. Tries native
  // share sheet first (phone), falls back to the WhatsApp / Email / SMS /
  // Copy dropdown on desktop.
  async function sharePdf() {
    setPdfBusy('share'); setPdfError('')
    try {
      if (!onboarding) throw new Error('No onboarding submission.')
      let url = shareUrl
      if (!url) {
        const res = await fetch('/api/pdf/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: onboarding.client_id, mode: 'save' }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(j.error || 'Failed to generate PDF')
        }
        const data = await res.json()
        url = data.pdf_url as string
        setShareUrl(url)
      }

      const firstName = client?.full_name?.split(' ')[0] || 'there'
      const message = `Hi ${firstName} — here's a copy of the onboarding file you submitted, including the declaration you signed. Keep this for your records. — Jess\n\n${url}`

      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          await navigator.share({ title: 'Your onboarding file', text: message, url })
          return
        } catch {
          // user cancelled or share unavailable — fall through to dropdown
        }
      }
      setShareMenuOpen(true)
    } catch (e: unknown) {
      setPdfError(e instanceof Error ? e.message : 'Failed to share PDF.')
    } finally {
      setPdfBusy(null)
    }
  }

  const firstName = client?.full_name?.split(' ')[0] || 'there'
  const shareMessage = shareUrl
    ? `Hi ${firstName} — here's a copy of the onboarding file you submitted, including the declaration you signed. Keep this for your records. — Jess\n\n${shareUrl}`
    : ''
  const enc = encodeURIComponent
  const phoneRaw = (client?.phone || '').replace(/[^0-9+]/g, '')
  const whatsappUrl = phoneRaw
    ? `https://wa.me/${phoneRaw.replace(/^\+/, '')}?text=${enc(shareMessage)}`
    : `https://wa.me/?text=${enc(shareMessage)}`
  const smsUrl = phoneRaw ? `sms:${phoneRaw}?body=${enc(shareMessage)}` : `sms:?body=${enc(shareMessage)}`
  const mailUrl = `mailto:${client?.email || ''}?subject=${enc('Your onboarding file from Jess')}&body=${enc(shareMessage)}`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end flex-wrap gap-2">
        <Button size="sm" variant="outline" loading={pdfBusy === 'view'} onClick={viewPdf}>
          View full PDF
        </Button>
        <div className="relative">
          <Button size="sm" loading={pdfBusy === 'share'} onClick={sharePdf}>
            Send to client
          </Button>
          {shareMenuOpen && shareUrl && (
            <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] bg-[#141414] border border-[rgba(255,255,255,0.24)] rounded-sm shadow-lg flex flex-col py-1">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShareMenuOpen(false)} className="px-4 py-2 text-xs tracking-widest uppercase text-[#e0d8cc] hover:bg-[rgba(255,255,255,0.06)] transition-colors">WhatsApp</a>
              <a href={mailUrl} onClick={() => setShareMenuOpen(false)} className="px-4 py-2 text-xs tracking-widest uppercase text-[#e0d8cc] hover:bg-[rgba(255,255,255,0.06)] transition-colors">Email</a>
              <a href={smsUrl} onClick={() => setShareMenuOpen(false)} className="px-4 py-2 text-xs tracking-widest uppercase text-[#e0d8cc] hover:bg-[rgba(255,255,255,0.06)] transition-colors">SMS</a>
              <button
                onClick={async () => { await navigator.clipboard.writeText(shareMessage); setShareMenuOpen(false) }}
                className="text-left px-4 py-2 text-xs tracking-widest uppercase text-[#e0d8cc] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                Copy full message
              </button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShareMenuOpen(false)} className="px-4 py-2 text-xs tracking-widest uppercase text-[#b8b4ac] border-t border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.06)] transition-colors">Open PDF link</a>
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={openEdit}>
          Edit onboarding answers
        </Button>
      </div>
      {pdfError && <p className="text-xs text-[#b06060] text-right -mt-3">{pdfError}</p>}
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
        size="xl"
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
