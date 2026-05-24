'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { CheckinSubmission, Client, OnboardingSubmission } from '@/types'

interface Props {
  checkins: CheckinSubmission[]
  clientId: string
  client?: Client
  onboarding?: OnboardingSubmission | null
}

export default function CheckinsTab({ checkins, client, onboarding }: Props) {
  const [expanded, setExpanded] = useState<string | null>(checkins[0]?.id ?? null)
  const [aiReplyState, setAiReplyState] = useState<Record<string, { loading: boolean; reply: string; concerns: string[]; copied: boolean; error?: string }>>({})
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  async function draftAiReply(checkin: CheckinSubmission) {
    if (!client) return
    setAiReplyState((s) => ({ ...s, [checkin.id]: { loading: true, reply: s[checkin.id]?.reply || '', concerns: [], copied: false } }))
    // Previous check-in for comparison context (next in the sorted list — checkins is desc by created_at).
    const idx = checkins.findIndex((c) => c.id === checkin.id)
    const previousCheckin = idx >= 0 && idx + 1 < checkins.length ? checkins[idx + 1] : null
    try {
      const res = await fetch('/api/ai/checkin-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: {
            full_name: client.full_name,
            goal: client.goal,
            primary_goal_kcal: client.primary_goal_kcal,
            protein_target_g: client.protein_target_g,
          },
          checkin,
          previousCheckin,
          onboardingPayload: onboarding?.payload ?? null,
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
      {checkins.map((checkin) => {
        const isNew = new Date(checkin.created_at) > oneWeekAgo
        const isOpen = expanded === checkin.id
        const p = checkin.payload
        const measurements = checkin.body_measurements ?? {}
        const photos = checkin.photos ?? []
        const replyState = aiReplyState[checkin.id]

        return (
          <Card key={checkin.id}>
            <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setExpanded(isOpen ? null : checkin.id)}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#f0ece4]">Week {checkin.week_number ?? '—'}</span>
                <span className="text-xs text-[#b8b4ac]">{formatDate(checkin.created_at)}</span>
                {isNew && <Badge variant="active">Needs review</Badge>}
                {photos.length > 0 && <Badge variant="default">{photos.length} photo{photos.length === 1 ? '' : 's'}</Badge>}
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 flex flex-col gap-5 border-t border-[rgba(255,255,255,0.24)]">
                {/* Body & weight */}
                <Section title="Body">
                  {p.weight_kg != null && <Row label="Weight" value={`${p.weight_kg} kg`} />}
                  {p.clothes_fit && <Row label="Clothes" value={p.clothes_fit} />}
                  {p.body_feel && <Row label="Body feel" value={p.body_feel} />}
                </Section>

                {/* Body measurements — optional, only show if any were provided */}
                {Object.keys(measurements).length > 0 && (
                  <Section title="Tape measurements (cm)">
                    {measurements.waist_cm != null && <Row label="Waist" value={`${measurements.waist_cm} cm`} />}
                    {measurements.hips_cm != null && <Row label="Hips" value={`${measurements.hips_cm} cm`} />}
                    {measurements.chest_cm != null && <Row label="Chest" value={`${measurements.chest_cm} cm`} />}
                    {measurements.thigh_cm != null && <Row label="Thigh" value={`${measurements.thigh_cm} cm`} />}
                    {measurements.arm_cm != null && <Row label="Arm" value={`${measurements.arm_cm} cm`} />}
                  </Section>
                )}

                {/* Photos — private, click to view large */}
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
                  {p.prs && <RowFull label="PBs / improvements" value={p.prs} />}
                  {p.discomfort && <RowFull label="Discomfort" value={p.discomfort} />}
                </Section>

                {/* Recovery */}
                <Section title="Recovery">
                  {p.sleep_quality && <Row label="Sleep" value={p.sleep_quality} />}
                  {p.stress_level && <Row label="Stress" value={p.stress_level} />}
                  {p.energy && <Row label="Energy" value={p.energy} />}
                  {p.water_intake && <Row label="Water" value={p.water_intake} />}
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

                {/* AI-drafted reply — edit before sending */}
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
                        Click &ldquo;Draft reply&rdquo; — uses this check-in, the previous one for comparison, and the client&apos;s onboarding context. You can edit before copying.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
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
