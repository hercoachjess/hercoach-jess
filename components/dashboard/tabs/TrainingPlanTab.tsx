'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Client, TrainingPlan, TrainingSession, OnboardingSubmission } from '@/types'

interface Props {
  client: Client
  initialTrainingPlan: TrainingPlan | null
  onboarding: OnboardingSubmission | null
}

export default function TrainingPlanTab({ client, initialTrainingPlan, onboarding }: Props) {
  const router = useRouter()
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(initialTrainingPlan)
  const [editing, setEditing] = useState(false)
  const [editingSessionIdx, setEditingSessionIdx] = useState<number | null>(null)
  const [aiDrafting, setAiDrafting] = useState(false)
  const [aiRevising, setAiRevising] = useState(false)
  const [reviseInstructions, setReviseInstructions] = useState('')
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ob = onboarding?.payload
  const [editedSessions, setEditedSessions] = useState<TrainingSession[]>(trainingPlan?.sessions ?? [])
  const [level, setLevel] = useState<TrainingPlan['level']>(trainingPlan?.level ?? 'beginner')
  const [daysPerWeek, setDaysPerWeek] = useState(trainingPlan?.days_per_week ?? 3)
  const [coachNotes, setCoachNotes] = useState(trainingPlan?.coach_notes ?? '')

  async function aiDraft() {
    setAiDrafting(true)
    setError('')
    try {
      const res = await fetch('/api/ai/training-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.full_name,
          goal: client.goal || '',
          level,
          daysPerWeek,
          gymAccess: ob?.lifestyle?.training_location || 'Gym',
          injuries: ob?.health_screening?.injuries || '',
          trainingGoals: ob?.goals?.why || client.goal || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditedSessions(data.sessions)
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
      const res = await fetch('/api/ai/revise-training-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.full_name,
          goal: client.goal || '',
          level,
          daysPerWeek,
          gymAccess: ob?.lifestyle?.training_location || 'Gym',
          injuries: ob?.health_screening?.injuries || '',
          currentSessions: editedSessions,
          currentCoachNotes: coachNotes,
          instructions: reviseInstructions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditedSessions(data.sessions)
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
          mealPlan: null,
          trainingPlan: {
            ...(trainingPlan ?? {}),
            level,
            days_per_week: daysPerWeek,
            sessions: editedSessions,
            coach_notes: coachNotes,
          },
          version: trainingPlan?.status === 'saved' ? 'current' : 'draft',
          includeNumbers: true,
          scope: 'training',
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
      a.download = `${client.full_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-training-plan.pdf`
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

    if (trainingPlan?.id) {
      await supabase.from('training_plans').update({
        sessions: editedSessions,
        level,
        days_per_week: daysPerWeek,
        coach_notes: coachNotes,
        status: 'draft',
        updated_at: now,
      }).eq('id', trainingPlan.id)
    } else {
      const { data } = await supabase.from('training_plans').insert({
        client_id: client.id,
        sessions: editedSessions,
        level,
        days_per_week: daysPerWeek,
        coach_notes: coachNotes,
        status: 'draft',
        is_current: true,
        updated_at: now,
      }).select().single()
      if (data) setTrainingPlan(data)
    }
    setEditing(false)
    setSaving(false)
    router.refresh()
  }

  function updateExercise(sIdx: number, eIdx: number, field: string, value: string | number) {
    setEditedSessions((sessions) => {
      const updated = [...sessions]
      const exercises = [...updated[sIdx].exercises]
      exercises[eIdx] = { ...exercises[eIdx], [field]: value }
      updated[sIdx] = { ...updated[sIdx], exercises }
      return updated
    })
  }

  function addExercise(sIdx: number) {
    setEditedSessions((sessions) => {
      const updated = [...sessions]
      updated[sIdx] = {
        ...updated[sIdx],
        exercises: [...updated[sIdx].exercises, { name: '', sets: 3, reps: '8–10', notes: '' }],
      }
      return updated
    })
  }

  function removeExercise(sIdx: number, eIdx: number) {
    setEditedSessions((sessions) => {
      const updated = [...sessions]
      updated[sIdx] = {
        ...updated[sIdx],
        exercises: updated[sIdx].exercises.filter((_, i) => i !== eIdx),
      }
      return updated
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#b8b4ac]">
              Status: <span className="text-[#e0d8cc]">{trainingPlan?.status ?? 'No plan'}</span>
              {trainingPlan?.updated_at && (
                <span className="ml-3">Last edited: {formatDate(trainingPlan.updated_at)}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" loading={aiDrafting} onClick={aiDraft}>
              AI draft new version
            </Button>
            {editedSessions.length > 0 && (
              <Button variant="outline" size="sm" loading={exporting} onClick={exportPdf}>
                Export as PDF
              </Button>
            )}
            {trainingPlan && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Ask AI to change */}
      {editedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Ask AI to change this plan</span>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <textarea
              className="input-underline text-sm"
              rows={3}
              placeholder="e.g. Add a fourth day with conditioning · Swap back squats for goblet squats (knee issue) · Make Wednesday upper-body push-focused · Reduce volume on Friday"
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

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardBody>
            <p className="text-xs text-[#b8b4ac] mb-1">Experience level</p>
            {editing ? (
              <select className="input-underline text-sm" value={level} onChange={(e) => setLevel(e.target.value as TrainingPlan['level'])}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            ) : (
              <p className="text-lg text-[#f0ece4] capitalize">{level}</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-[#b8b4ac] mb-1">Training days / week</p>
            {editing ? (
              <input
                type="number" min="1" max="7"
                className="input-underline text-lg w-20"
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              />
            ) : (
              <p className="text-lg text-[#f0ece4]">{daysPerWeek} days</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Sessions */}
      {editedSessions.length === 0 && !editing && (
        <div className="text-center py-16 text-[#b8b4ac] text-sm">
          No training plan yet. Use &ldquo;AI draft new version&rdquo; or &ldquo;Edit&rdquo; to create one.
        </div>
      )}

      {editedSessions.map((session, sIdx) => {
        const isRest = session.exercises.length === 0

        return (
          <Card key={sIdx}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#f0ece4]">{session.day}</span>
                  <span className="text-xs text-[#c89a6a]">{session.focus}</span>
                </div>
                {editing && !isRest && (
                  <Button size="sm" variant="ghost" onClick={() => setEditingSessionIdx(editingSessionIdx === sIdx ? null : sIdx)}>
                    {editingSessionIdx === sIdx ? 'Done' : 'Edit'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {isRest ? (
                <p className="text-sm text-[#b8b4ac] italic">Rest day</p>
              ) : editing && editingSessionIdx === sIdx ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <p className="text-xs text-[#b8b4ac] mb-1">Day</p>
                      <input className="input-underline text-sm" value={session.day}
                        onChange={(e) => setEditedSessions((s) => { const u=[...s]; u[sIdx]={...u[sIdx],day:e.target.value}; return u })} />
                    </div>
                    <div>
                      <p className="text-xs text-[#b8b4ac] mb-1">Focus</p>
                      <input className="input-underline text-sm" value={session.focus}
                        onChange={(e) => setEditedSessions((s) => { const u=[...s]; u[sIdx]={...u[sIdx],focus:e.target.value}; return u })} />
                    </div>
                  </div>

                  {/* Exercise rows */}
                  <div className="grid grid-cols-[1fr_60px_60px_auto] gap-2 text-xs text-[#b8b4ac] tracking-wider uppercase mb-1">
                    <span>Exercise</span><span>Sets</span><span>Reps</span><span />
                  </div>
                  {session.exercises.map((ex, eIdx) => (
                    <div key={eIdx} className="flex flex-col gap-1">
                      <div className="grid grid-cols-[1fr_60px_60px_auto] gap-2 items-center">
                        <input className="input-underline text-sm" value={ex.name} placeholder="Exercise name"
                          onChange={(e) => updateExercise(sIdx, eIdx, 'name', e.target.value)} />
                        <input type="number" className="input-underline text-sm text-center" value={ex.sets}
                          onChange={(e) => updateExercise(sIdx, eIdx, 'sets', Number(e.target.value))} />
                        <input className="input-underline text-sm text-center" value={ex.reps} placeholder="8–10"
                          onChange={(e) => updateExercise(sIdx, eIdx, 'reps', e.target.value)} />
                        <button className="text-[#b8b4ac] hover:text-[#b06060] transition-colors"
                          onClick={() => removeExercise(sIdx, eIdx)}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                      <input className="input-underline text-xs text-[#b8b4ac]" value={ex.notes || ''} placeholder="Notes (optional)"
                        onChange={(e) => updateExercise(sIdx, eIdx, 'notes', e.target.value)} />
                    </div>
                  ))}
                  <button className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] text-left transition-colors mt-1"
                    onClick={() => addExercise(sIdx)}>
                    + Add exercise
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[#b8b4ac] uppercase tracking-widest">
                      <th className="text-left pb-2 font-normal">Exercise</th>
                      <th className="text-right pb-2 font-normal">Sets × Reps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.exercises.map((ex, eIdx) => (
                      <tr key={eIdx} className="border-t border-[rgba(255,255,255,0.10)]">
                        <td className="py-2">
                          <p className="text-[#e0d8cc]">{ex.name}</p>
                          {ex.notes && <p className="text-xs text-[#8a8680] italic">{ex.notes}</p>}
                        </td>
                        <td className="py-2 text-right text-[#b8b4ac]">
                          {ex.sets} × {ex.reps}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        )
      })}

      {/* Coach notes */}
      {(editing || coachNotes) && (
        <Card>
          <CardBody>
            <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">Coach notes</p>
            {editing ? (
              <textarea className="input-underline text-sm" rows={3} value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)} placeholder="Optional notes..." />
            ) : (
              <p className="text-sm text-[#e0d8cc] leading-relaxed italic">{coachNotes}</p>
            )}
          </CardBody>
        </Card>
      )}

      {error && <p className="text-sm text-[#b06060]">{error}</p>}

      <p className="text-xs text-[#8a8680] leading-relaxed">
        AI uses evidence-based programming (progressive overload, balanced volume, injury adaptations) — you always review before saving.
      </p>

      {editing && (
        <div className="flex gap-3 pt-2">
          <Button onClick={saveDraft} loading={saving}>Save draft</Button>
          <Button variant="ghost" onClick={() => { setEditing(false); setEditingSessionIdx(null) }}>
            Discard changes
          </Button>
        </div>
      )}
    </div>
  )
}
