'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { CheckinSubmission } from '@/types'

interface Props {
  checkins: CheckinSubmission[]
  clientId: string
}

export default function CheckinsTab({ checkins }: Props) {
  const [expanded, setExpanded] = useState<string | null>(checkins[0]?.id ?? null)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  if (checkins.length === 0) {
    return <div className="text-center py-20 text-[#6b6764] text-sm">No check-ins yet.</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {checkins.map((checkin) => {
        const isNew = new Date(checkin.created_at) > oneWeekAgo
        const isOpen = expanded === checkin.id
        const p = checkin.payload

        return (
          <Card key={checkin.id}>
            <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setExpanded(isOpen ? null : checkin.id)}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#f0ece4]">Week {checkin.week_number ?? '—'}</span>
                <span className="text-xs text-[#6b6764]">{formatDate(checkin.created_at)}</span>
                {isNew && <Badge variant="active">Needs review</Badge>}
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 flex flex-col gap-5 border-t border-[rgba(255,255,255,0.07)]">
                {/* Body & weight */}
                <Section title="Body">
                  {p.weight_kg != null && <Row label="Weight" value={`${p.weight_kg} kg`} />}
                  {p.clothes_fit && <Row label="Clothes" value={p.clothes_fit} />}
                  {p.body_feel && <Row label="Body feel" value={p.body_feel} />}
                </Section>

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
                    <p className="text-sm text-[#c8c4bc] leading-relaxed">{p.biggest_win}</p>
                  </div>
                )}
                {p.hardest_part && (
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-1 text-[#c89a6a]">Hardest part</p>
                    <p className="text-sm text-[#c8c4bc] leading-relaxed">{p.hardest_part}</p>
                  </div>
                )}
                {p.mood && (
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-1 text-[#6b6764]">Mood</p>
                    <p className="text-sm text-[#c8c4bc]">{p.mood}</p>
                  </div>
                )}
                {p.questions_for_jess && (
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-1 text-[#6b6764]">Questions for Jess</p>
                    <p className="text-sm text-[#c8c4bc] leading-relaxed">{p.questions_for_jess}</p>
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
      <p className="text-xs text-[#6b6764] tracking-widest uppercase mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#6b6764] mb-0.5">{label}</p>
      <p className="text-sm text-[#c8c4bc]">{value}</p>
    </div>
  )
}

function RowFull({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-2">
      <p className="text-xs text-[#6b6764] mb-0.5">{label}</p>
      <p className="text-sm text-[#c8c4bc] leading-relaxed">{value}</p>
    </div>
  )
}
