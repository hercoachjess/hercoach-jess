'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { CheckinSubmission, CheckinPayload, BodyMeasurements, Client, OnboardingSubmission } from '@/types'

interface Props {
  checkins: CheckinSubmission[]
  clientId: string
  client?: Client
  onboarding?: OnboardingSubmission | null
}

// Editable check-in fields with display labels, drives the Edit modal UI.
// Free-text fields render as textareas, the others as text inputs.
const CHECKIN_FIELDS: { key: keyof CheckinPayload; label: string; long?: boolean }[] = [
  { key: 'weight_kg',           label: 'Weight (kg)' },
  { key: 'clothes_fit',         label: 'Clothes fit' },
  { key: 'body_feel',           label: 'Body feel' },
  { key: 'nutrition_adherence', label: 'Nutrition adherence' },
  { key: 'hunger',              label: 'Hunger' },
  { key: 'cravings',            label: 'Cravings', long: true },
  { key: 'threw_off',           label: 'What threw them off', long: true },
  { key: 'training_sessions',   label: 'Training sessions' },
  { key: 'training_feel',       label: 'How training felt' },
  { key: 'prs',                 label: 'PBs / improvements', long: true },
  { key: 'discomfort',          label: 'Discomfort / pain', long: true },
  { key: 'sleep_quality',       label: 'Sleep quality' },
  { key: 'stress_level',        label: 'Stress level' },
  { key: 'energy',              label: 'Energy' },
  { key: 'water_intake',        label: 'Water intake' },
  { key: 'biggest_win',         label: 'Biggest win', long: true },
  { key: 'hardest_part',        label: 'Hardest part', long: true },
  { key: 'mood',                label: 'Mood' },
  { key: 'questions_for_jess',  label: 'Questions / notes for Jess', long: true },
]

const MEASUREMENT_FIELDS: { key: keyof BodyMeasurements; label: string }[] = [
  { key: 'waist_cm', label: 'Waist (cm)' },
  { key: 'hips_cm',  label: 'Hips (cm)' },
  { key: 'chest_cm', label: 'Chest (cm)' },
  { key: 'thigh_cm', label: 'Thigh (cm)' },
  { key: 'arm_cm',   label: 'Arm (cm)' },
]

export default function CheckinsTab({ checkins, client, onboarding }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(checkins[0]?.id ?? null)
  const [aiReplyState, setAiReplyState] = useState<Record<string, { loading: boolean; reply: string; concerns: string[]; copied: boolean; error?: string }>>({})
  const [summaryState, setSummaryState] = useState<Record<string, { loading: boolean; error?: string }>>({})
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({})
  const [savingResponse, setSavingResponse] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<CheckinSubmission | null>(null)
  const [editPayload, setEditPayload] = useState<CheckinPayload | null>(null)
  const [editMeasurements, setEditMeasurements] = useState<BodyMeasurements>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Mark a check-in as reviewed, clears the notification + (if not yet cached)
  // generates the AI summary in the background so it's ready for next week.
  async function markReviewed(checkin: CheckinSubmission) {
    const supabase = createClient()
    await supabase
      .from('checkin_submissions')
      .update({ coach_reviewed_at: new Date().toISOString() })
      .eq('id', checkin.id)
    if (!checkin.ai_summary || checkin.ai_summary.length === 0) {
      // Fire-and-refresh, don't block the click on summary generation.
      generateSummary(checkin)
    } else {
      router.refresh()
    }
  }

  async function unmarkReviewed(checkin: CheckinSubmission) {
    const supabase = createClient()
    await supabase
      .from('checkin_submissions')
      .update({ coach_reviewed_at: null })
      .eq('id', checkin.id)
    router.refresh()
  }

  async function saveResponseSent(checkin: CheckinSubmission, value: string) {
    setSavingResponse((s) => ({ ...s, [checkin.id]: true }))
    const supabase = createClient()
    await supabase
      .from('checkin_submissions')
      .update({ coach_response_sent: value })
      .eq('id', checkin.id)
    setSavingResponse((s) => ({ ...s, [checkin.id]: false }))
    router.refresh()
  }

  async function generateSummary(checkin: CheckinSubmission) {
    setSummaryState((s) => ({ ...s, [checkin.id]: { loading: true } }))
    try {
      const res = await fetch('/api/ai/checkin-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const supabase = createClient()
      await supabase
        .from('checkin_submissions')
        .update({ ai_summary: data.summary })
        .eq('id', checkin.id)
      setSummaryState((s) => ({ ...s, [checkin.id]: { loading: false } }))
      router.refresh()
    } catch (e: unknown) {
      setSummaryState((s) => ({ ...s, [checkin.id]: { loading: false, error: e instanceof Error ? e.message : 'Failed to generate.' } }))
    }
  }

  function openEdit(checkin: CheckinSubmission) {
    setEditing(checkin)
    setEditPayload({ ...checkin.payload })
    setEditMeasurements({ ...(checkin.body_measurements ?? {}) })
    setEditError('')
  }

  async function saveEdit() {
    if (!editing || !editPayload) return
    setSavingEdit(true); setEditError('')
    // Trim empty measurement entries so we don't write {waist_cm: null} when blank.
    const cleanedMeasurements: BodyMeasurements = {}
    for (const f of MEASUREMENT_FIELDS) {
      const v = editMeasurements[f.key]
      if (v != null && v !== ('' as unknown as number)) cleanedMeasurements[f.key] = Number(v)
    }
    const supabase = createClient()
    const { error: e } = await supabase
      .from('checkin_submissions')
      .update({
        payload: editPayload,
        body_measurements: cleanedMeasurements,
      })
      .eq('id', editing.id)
    setSavingEdit(false)
    if (e) { setEditError(e.message); return }
    setEditing(null)
    setEditPayload(null)
    setEditMeasurements({})
    router.refresh()
  }

  async function draftAiReply(checkin: CheckinSubmission) {
    if (!client) return
    setAiReplyState((s) => ({ ...s, [checkin.id]: { loading: true, reply: s[checkin.id]?.reply || '', concerns: [], copied: false } }))
    // Previous check-in for comparison context (next in the sorted list, checkins is desc by created_at).
    const idx = checkins.findIndex((c) => c.id === checkin.id)
    const previousCheckin = idx >= 0 && idx + 1 < checkins.length ? checkins[idx + 1] : null
    // Pull the last 4 actual replies Jess sent so the AI knows what NOT to
    // repeat and can mirror her voice. Also pull the cached summaries from
    // older weeks for continuity. Both ordered most-recent-first.
    const older = idx >= 0 ? checkins.slice(idx + 1) : []
    const priorReplies = older
      .filter((c) => c.coach_response_sent && c.coach_response_sent.trim().length > 0)
      .slice(0, 4)
      .map((c) => ({
        week_number: c.week_number,
        date: c.created_at.slice(0, 10),
        reply: c.coach_response_sent as string,
      }))
    const priorSummaries = older
      .filter((c) => c.ai_summary && c.ai_summary.length > 0)
      .slice(0, 4)
      .map((c) => ({
        week_number: c.week_number,
        date: c.created_at.slice(0, 10),
        bullets: c.ai_summary as string[],
      }))
    try {
      const res = await fetch('/api/ai/checkin-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: {
            id: client.id,
            full_name: client.full_name,
            goal: client.goal,
            primary_goal_kcal: client.primary_goal_kcal,
            protein_target_g: client.protein_target_g,
          },
          checkin,
          previousCheckin,
          onboardingPayload: onboarding?.payload ?? null,
          priorReplies,
          priorSummaries,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiReplyState((s) => ({ ...s, [checkin.id]: { loading: false, reply: data.reply, concerns: data.concerns || [], copied: false } }))
    } catch (e: unknown) {
      setAiReplyState((s) => ({ ...s, [checkin.id]: { loading: false, reply: '', concerns: [], copied: false, error: e instanceof Error ? e.message : 'Failed to draft reply.' } }))
    }
  }

  async function copyReply(checkinId: string) {
    const state = aiReplyState[checkinId]
    if (!state?.reply) return
    await navigator.clipboard.writeText(state.reply)
    setAiReplyState((s) => ({ ...s, [checkinId]: { ...state, copied: true } }))
    setTimeout(() => {
      setAiReplyState((s) => ({ ...s, [checkinId]: { ...(s[checkinId] || state), copied: false } }))
    }, 2000)
  }

  if (checkins.length === 0) {
    return <div className="text-center py-20 text-[#b8b4ac] text-sm">No check-ins yet.</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {checkins.map((checkin, idx) => {
        const isNew = new Date(checkin.created_at) > oneWeekAgo
        const isOpen = expanded === checkin.id
        const p = checkin.payload
        const measurements = checkin.body_measurements ?? {}
        const photos = checkin.photos ?? []
        const replyState = aiReplyState[checkin.id]
        const reviewed = !!checkin.coach_reviewed_at
        // The next item in the array is the chronologically PREVIOUS check-in
        // (because the list is sorted desc). Its cached AI summary is what we
        // show at the top of this one for context.
        const previousCheckin = idx + 1 < checkins.length ? checkins[idx + 1] : null
        const previousSummary = previousCheckin?.ai_summary && previousCheckin.ai_summary.length > 0 ? previousCheckin.ai_summary : null

        return (
          <Card key={checkin.id}>
            <button className="w-full flex items-center justify-between px-5 py-4 text-left gap-3" onClick={() => setExpanded(isOpen ? null : checkin.id)}>
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <span className="text-sm font-medium text-[#f0ece4]">Week {checkin.week_number ?? '—'}</span>
                <span className="text-xs text-[#b8b4ac]">{formatDate(checkin.created_at)}</span>
                {!reviewed && isNew && <Badge variant="active">Needs review</Badge>}
                {reviewed && <Badge variant="paid">Reviewed</Badge>}
                {photos.length > 0 && <Badge variant="default">{photos.length} photo{photos.length === 1 ? '' : 's'}</Badge>}
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 flex flex-col gap-5 border-t border-[rgba(255,255,255,0.24)]">
                {/* Previous week's summary, top of card for quick context.
                    Only shown when a cached summary exists from last time. */}
                {previousSummary && previousCheckin && (
                  <div className="pt-4 px-3 py-2 border-l-2 border-[#7da87d] bg-[rgba(125,168,125,0.05)]">
                    <p className="text-xs text-[#7da87d] tracking-wider uppercase mb-1">
                      Last week (Week {previousCheckin.week_number} · {formatDate(previousCheckin.created_at)})
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {previousSummary.map((line, i) => (
                        <li key={i} className="text-xs text-[#e0d8cc] leading-relaxed">{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Body & weight */}
                <Section title="Body">
                  {p.weight_kg != null && <Row label="Weight" value={`${p.weight_kg} kg`} />}
                  {p.clothes_fit && <Row label="Clothes" value={p.clothes_fit} />}
                  {p.body_feel && <Row label="Body feel" value={p.body_feel} />}
                </Section>

                {/* Body measurements, optional, only show if any were provided */}
                {Object.keys(measurements).length > 0 && (
                  <Section title="Tape measurements (cm)">
                    {measurements.waist_cm != null && <Row label="Waist" value={`${measurements.waist_cm} cm`} />}
                    {measurements.hips_cm != null && <Row label="Hips" value={`${measurements.hips_cm} cm`} />}
                    {measurements.chest_cm != null && <Row label="Chest" value={`${measurements.chest_cm} cm`} />}
                    {measurements.thigh_cm != null && <Row label="Thigh" value={`${measurements.thigh_cm} cm`} />}
                    {measurements.arm_cm != null && <Row label="Arm" value={`${measurements.arm_cm} cm`} />}
                  </Section>
                )}

                {/* Photos, private, click to view large */}
                {photos.length > 0 && (
                  <div className="pt-4">
                    <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">Progress photos</p>
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-[3/4] border border-[rgba(255,255,255,0.14)] rounded-sm overflow-hidden hover:border-[rgba(255,255,255,0.3)] transition-colors">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Progress ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nutrition */}
                <Section title="Nutrition">
                  {p.nutrition_adherence && <Row label="Adherence" value={p.nutrition_adherence} />}
                  {p.hunger && <Row label="Hunger" value={p.hunger} />}
                  {p.cravings && <RowFull label="Cravings" value={p.cravings} />}
                  {p.threw_off && <RowFull label="What threw them off" value={p.threw_off} />}
                </Section>

                {/* Training */}
                <Section title="Training">
                  {p.training_sessions && <Row label="Sessions" value={p.training_sessions} />}
                  {p.training_feel && <Row label="How it felt" value={p.training_feel} />}
                  {p.training_intensity && <Row label="Intensity" value={p.training_intensity} />}
                  {p.prs && <RowFull label="PBs / improvements" value={p.prs} />}
                  {p.discomfort && <RowFull label="Discomfort" value={p.discomfort} />}
                </Section>

                {/* Recovery */}
                <Section title="Recovery">
                  {p.sleep_quality && <Row label="Sleep" value={p.sleep_quality} />}
                  {p.stress_level && <Row label="Stress" value={p.stress_level} />}
                  {p.energy && <Row label="Energy" value={p.energy} />}
                  {p.water_intake && <Row label="Water" value={p.water_intake} />}
                  {p.daily_steps && <Row label="Daily steps" value={p.daily_steps} />}
                  {p.meals_feel && <Row label="How meals felt" value={p.meals_feel} />}
                </Section>

                {/* Wins & struggles */}
                {p.biggest_win && (
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-1 text-[#7da87d]">Biggest win</p>
                    <p className="text-sm text-[#e0d8cc] leading-relaxed">{p.biggest_win}</p>
                  </div>
                )}
                {p.hardest_part && (
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-1 text-[#c89a6a]">Hardest part</p>
                    <p className="text-sm text-[#e0d8cc] leading-relaxed">{p.hardest_part}</p>
                  </div>
                )}
                {p.mood && (
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-1 text-[#b8b4ac]">Mood</p>
                    <p className="text-sm text-[#e0d8cc]">{p.mood}</p>
                  </div>
                )}
                {p.questions_for_jess && (
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-1 text-[#b8b4ac]">Questions for Jess</p>
                    <p className="text-sm text-[#e0d8cc] leading-relaxed">{p.questions_for_jess}</p>
                  </div>
                )}
                {p.extra_notes && (
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-1 text-[#b8b4ac]">Extra notes</p>
                    <p className="text-sm text-[#e0d8cc] leading-relaxed">{p.extra_notes}</p>
                  </div>
                )}

                {/* Edit check-in, for coach fixes when client tells her they made a typo */}
                <div className="pt-3">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(checkin)}>
                    Edit this check-in
                  </Button>
                </div>

                {/* AI-drafted reply, edit before sending */}
                {client && (
                  <div className="pt-4 border-t border-[rgba(255,255,255,0.14)]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-[#b8b4ac] tracking-widest uppercase">AI-drafted reply</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" loading={replyState?.loading} onClick={() => draftAiReply(checkin)}>
                          {replyState?.reply ? 'Regenerate' : 'Draft reply'}
                        </Button>
                        {replyState?.reply && (
                          <Button size="sm" onClick={() => copyReply(checkin.id)}>
                            {replyState.copied ? 'Copied ✓' : 'Copy'}
                          </Button>
                        )}
                      </div>
                    </div>
                    {replyState?.concerns && replyState.concerns.length > 0 && (
                      <div className="mb-3 px-3 py-2 border-l-2 border-[#c89a6a] bg-[rgba(200,154,106,0.05)]">
                        <p className="text-xs text-[#c89a6a] tracking-wider uppercase mb-1">Clinical flag</p>
                        {replyState.concerns.map((c, i) => (
                          <p key={i} className="text-xs text-[#e0d8cc] leading-relaxed">{c}</p>
                        ))}
                      </div>
                    )}
                    {replyState?.error && (
                      <p className="text-xs text-[#b06060] mb-2">{replyState.error}</p>
                    )}
                    {replyState?.reply ? (
                      <textarea
                        className="input-underline text-sm leading-relaxed w-full"
                        rows={12}
                        value={replyState.reply}
                        onChange={(e) => setAiReplyState((s) => ({ ...s, [checkin.id]: { ...(s[checkin.id] || { loading: false, concerns: [], copied: false, reply: '' }), reply: e.target.value } }))}
                      />
                    ) : (
                      <p className="text-xs text-[#8a8680] italic leading-relaxed">
                        Click &ldquo;Draft reply&rdquo;, uses this check-in, the previous one for comparison, and the client&apos;s onboarding context. You can edit before copying.
                      </p>
                    )}
                  </div>
                )}

                {/* What you actually sent, captured separately so it appears on the record */}
                <div className="pt-4 border-t border-[rgba(255,255,255,0.14)]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-[#b8b4ac] tracking-widest uppercase">Your reply, as sent</p>
                    {savingResponse[checkin.id] && <span className="text-xs text-[#8a8680] italic">Saving…</span>}
                  </div>
                  <textarea
                    className="input-underline text-sm leading-relaxed w-full"
                    rows={4}
                    value={responseDrafts[checkin.id] ?? checkin.coach_response_sent ?? ''}
                    placeholder="Paste the reply you actually sent to the client. Stored on this check-in so you can look back."
                    onChange={(e) => setResponseDrafts((d) => ({ ...d, [checkin.id]: e.target.value }))}
                    onBlur={(e) => {
                      const value = e.target.value
                      if (value !== (checkin.coach_response_sent ?? '')) {
                        saveResponseSent(checkin, value)
                      }
                    }}
                  />
                </div>

                {/* AI summary of this check-in, a few bullets for fast scan next week */}
                <div className="pt-4 border-t border-[rgba(255,255,255,0.14)]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-[#b8b4ac] tracking-widest uppercase">Quick summary</p>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={summaryState[checkin.id]?.loading}
                      onClick={() => generateSummary(checkin)}
                    >
                      {checkin.ai_summary && checkin.ai_summary.length > 0 ? 'Regenerate' : 'Generate summary'}
                    </Button>
                  </div>
                  {summaryState[checkin.id]?.error && (
                    <p className="text-xs text-[#b06060] mb-2">{summaryState[checkin.id]?.error}</p>
                  )}
                  {checkin.ai_summary && checkin.ai_summary.length > 0 ? (
                    <ul className="flex flex-col gap-0.5">
                      {checkin.ai_summary.map((line, i) => (
                        <li key={i} className="text-sm text-[#e0d8cc] leading-relaxed">{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#8a8680] italic leading-relaxed">
                      Short bullet summary the AI cooks up from this check-in, shown at the top of next week&apos;s for context. Auto-generates when you mark this reviewed; or hit Generate.
                    </p>
                  )}
                </div>

                {/* Mark-reviewed, clears the notification from your dashboard */}
                <div className="pt-4 border-t border-[rgba(255,255,255,0.14)] flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {reviewed ? (
                      <p className="text-xs text-[#7da87d] leading-relaxed">
                        ✓ Reviewed on {formatDate(checkin.coach_reviewed_at!)}, cleared from your dashboard count.
                      </p>
                    ) : (
                      <p className="text-xs text-[#8a8680] italic leading-relaxed">
                        Mark this reviewed once you&apos;ve replied. It clears from your &ldquo;Check-ins to review&rdquo; tile and from this client&apos;s &ldquo;New check-in&rdquo; badge.
                      </p>
                    )}
                  </div>
                  {reviewed ? (
                    <Button size="sm" variant="ghost" onClick={() => unmarkReviewed(checkin)}>
                      Mark unreviewed
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => markReviewed(checkin)}>
                      Mark as reviewed
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        )
      })}

      {/* Edit check-in modal, coach fixes typos / client mistakes */}
      <Modal
        open={!!editing && !!editPayload}
        onClose={() => { setEditing(null); setEditPayload(null); setEditMeasurements({}); setEditError('') }}
        title={editing ? `Edit Week ${editing.week_number} check-in` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setEditing(null); setEditPayload(null); setEditMeasurements({}); setEditError('') }}>Cancel</Button>
            <Button onClick={saveEdit} loading={savingEdit}>Save changes</Button>
          </>
        }
      >
        {editPayload && (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-[#8a8680] italic leading-relaxed">
              Use this when the client tells you something was a typo or mis-clicked. Saves overwrite the original submission, the date stays the same.
            </p>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Name (as submitted)</label>
              <input
                className="input-underline text-sm"
                value={editPayload.name}
                onChange={(e) => setEditPayload({ ...editPayload, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Email (as submitted)</label>
              <input
                className="input-underline text-sm"
                value={editPayload.email}
                onChange={(e) => setEditPayload({ ...editPayload, email: e.target.value })}
              />
            </div>
            {CHECKIN_FIELDS.map((f) => {
              const v = editPayload[f.key]
              const displayValue = v == null ? '' : String(v)
              return (
                <div key={String(f.key)}>
                  <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">{f.label}</label>
                  {f.long ? (
                    <textarea
                      className="input-underline text-sm"
                      rows={3}
                      value={displayValue}
                      onChange={(e) => setEditPayload({ ...editPayload, [f.key]: e.target.value } as CheckinPayload)}
                    />
                  ) : (
                    <input
                      type={f.key === 'weight_kg' ? 'number' : 'text'}
                      step={f.key === 'weight_kg' ? '0.1' : undefined}
                      className="input-underline text-sm"
                      value={displayValue}
                      onChange={(e) => {
                        const raw = e.target.value
                        const next = f.key === 'weight_kg' ? (raw === '' ? null : Number(raw)) : raw
                        setEditPayload({ ...editPayload, [f.key]: next } as CheckinPayload)
                      }}
                    />
                  )}
                </div>
              )
            })}

            <div className="pt-2 border-t border-[rgba(255,255,255,0.14)]">
              <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">Body measurements (cm), optional</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {MEASUREMENT_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-[#b8b4ac] block mb-1">{f.label}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-underline text-sm"
                      value={editMeasurements[f.key] == null ? '' : String(editMeasurements[f.key])}
                      onChange={(e) => {
                        const raw = e.target.value
                        setEditMeasurements((m) => ({
                          ...m,
                          [f.key]: raw === '' ? undefined : Number(raw),
                        }))
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            {editError && <p className="text-sm text-[#b06060]">{editError}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : !!children
  if (!hasContent) return null
  return (
    <div className="pt-4">
      <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#b8b4ac] mb-0.5">{label}</p>
      <p className="text-sm text-[#e0d8cc]">{value}</p>
    </div>
  )
}

function RowFull({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-2">
      <p className="text-xs text-[#b8b4ac] mb-0.5">{label}</p>
      <p className="text-sm text-[#e0d8cc] leading-relaxed">{value}</p>
    </div>
  )
}
