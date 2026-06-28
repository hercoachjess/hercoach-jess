'use client'

import { useState } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import type { Client, CheckinSubmission } from '@/types'

const AREA_OPTIONS = [
  { key: 'weight',    label: 'Weight' },
  { key: 'body_feel', label: 'Body feel' },
  { key: 'adherence', label: 'Nutrition adherence' },
  { key: 'hunger',    label: 'Hunger' },
  { key: 'training',  label: 'Training' },
  { key: 'sleep',     label: 'Sleep' },
  { key: 'stress',    label: 'Stress' },
  { key: 'energy',    label: 'Energy' },
  { key: 'mood',      label: 'Mood' },
  { key: 'wins',      label: 'Wins' },
  { key: 'struggles', label: 'Struggles' },
]

const FIELD_LAYOUT: { section: string; fields: { key: keyof CheckinSubmission['payload']; label: string }[] }[] = [
  { section: 'Body', fields: [
    { key: 'weight_kg',   label: 'Weight (kg)' },
    { key: 'clothes_fit', label: 'Clothes' },
    { key: 'body_feel',   label: 'Body feel' },
  ]},
  { section: 'Nutrition', fields: [
    { key: 'nutrition_adherence', label: 'Adherence' },
    { key: 'hunger',              label: 'Hunger' },
    { key: 'cravings',            label: 'Cravings' },
    { key: 'threw_off',           label: 'What threw them off' },
  ]},
  { section: 'Training', fields: [
    { key: 'training_sessions', label: 'Sessions' },
    { key: 'training_feel',     label: 'How it felt' },
    { key: 'prs',               label: 'PBs / improvements' },
    { key: 'discomfort',        label: 'Discomfort / pain' },
  ]},
  { section: 'Recovery & Wellbeing', fields: [
    { key: 'sleep_quality', label: 'Sleep' },
    { key: 'stress_level',  label: 'Stress' },
    { key: 'energy',        label: 'Energy' },
    { key: 'water_intake',  label: 'Water' },
  ]},
  { section: 'Wins & Struggles', fields: [
    { key: 'biggest_win',         label: 'Biggest win' },
    { key: 'hardest_part',        label: 'Hardest part' },
    { key: 'mood',                label: 'Mood' },
    { key: 'questions_for_jess',  label: 'Questions / notes for Jess' },
  ]},
]

interface Props {
  checkins: CheckinSubmission[]
  client: Client
}

export default function CompareTab({ checkins, client }: Props) {
  const [fromId, setFromId] = useState(checkins[checkins.length - 1]?.id ?? '')
  const [toId, setToId] = useState(checkins[0]?.id ?? '')
  const [areas, setAreas] = useState<string[]>(AREA_OPTIONS.map((a) => a.key))
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'ai' | 'side'>('ai')
  const [expanded, setExpanded] = useState<CheckinSubmission | null>(null)

  function toggleArea(key: string) {
    setAreas((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]))
  }

  async function generate() {
    const fromCheckin = checkins.find((c) => c.id === fromId)
    const toCheckin = checkins.find((c) => c.id === toId)
    if (!fromCheckin || !toCheckin) return
    setGenerating(true); setError(''); setDraft('')
    try {
      const res = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.full_name, clientGoal: client.goal || '',
          fromCheckin, toCheckin, areas,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDraft(data.draft)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate.')
    } finally { setGenerating(false) }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (checkins.length < 2) {
    return <div className="text-center py-20 text-[#b8b4ac] text-sm">At least 2 check-ins are needed to compare.</div>
  }

  const fromCheckin = checkins.find((c) => c.id === fromId)
  const toCheckin = checkins.find((c) => c.id === toId)

  return (
    <div className="flex flex-col gap-6">
      {/* View mode toggle */}
      <div className="flex gap-2 border-b border-[rgba(255,255,255,0.14)]">
        {[
          { key: 'ai', label: 'AI Feedback Draft' },
          { key: 'side', label: 'Side-by-side comparison' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setView(m.key as 'ai' | 'side')}
            className={`px-4 py-2.5 text-xs tracking-wider uppercase transition-colors border-b-2 ${
              view === m.key
                ? 'text-[#f0ece4] border-[#f0ece4]'
                : 'text-[#b8b4ac] border-transparent hover:text-[#e0d8cc]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Select check-ins to compare</span>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-1.5 block">From</label>
              <select className="input-underline text-sm" value={fromId} onChange={(e) => setFromId(e.target.value)}>
                {checkins.map((c) => (
                  <option key={c.id} value={c.id}>Week {c.week_number}, {formatDate(c.created_at)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-1.5 block">To</label>
              <select className="input-underline text-sm" value={toId} onChange={(e) => setToId(e.target.value)}>
                {checkins.map((c) => (
                  <option key={c.id} value={c.id}>Week {c.week_number}, {formatDate(c.created_at)}</option>
                ))}
              </select>
            </div>
          </div>

          {view === 'ai' && (
            <>
              <div>
                <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-3">Include areas</p>
                <div className="flex flex-wrap gap-2">
                  {AREA_OPTIONS.map(({ key, label }) => (
                    <button key={key} onClick={() => toggleArea(key)}
                      className={`text-xs px-3 py-1.5 border rounded-sm transition-colors ${
                        areas.includes(key)
                          ? 'border-[rgba(240,236,228,0.4)] text-[#f0ece4] bg-[rgba(240,236,228,0.06)]'
                          : 'border-[rgba(255,255,255,0.24)] text-[#b8b4ac]'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={generate} loading={generating} className="self-start">
                Generate feedback draft
              </Button>
            </>
          )}
        </CardBody>
      </Card>

      {error && <p className="text-sm text-[#b06060]">{error}</p>}

      {/* AI DRAFT VIEW */}
      {view === 'ai' && draft && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">AI draft, review and edit before sending</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={generate} loading={generating}>Regenerate</Button>
                <Button size="sm" onClick={copyToClipboard}>{copied ? 'Copied' : 'Approve & copy'}</Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <textarea className="input-underline text-sm leading-relaxed w-full" rows={12}
              value={draft} onChange={(e) => setDraft(e.target.value)} />
            <p className="text-xs text-[#8a8680] mt-3 leading-relaxed">
              AI draft based on evidence-based guidelines. Always review and edit before sending, your clinical judgement applies.
            </p>
          </CardBody>
        </Card>
      )}

      {/* SIDE-BY-SIDE VIEW */}
      {view === 'side' && fromCheckin && toCheckin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">
                Full side-by-side, every field, both check-ins
              </span>
              <span className="text-xs text-[#a8a49c]">Useful for recording feedback videos</span>
            </div>
          </CardHeader>
          <CardBody>
            {/* Column headers */}
            <div className="grid grid-cols-[160px_1fr_1fr] gap-4 pb-3 mb-3 border-b border-[rgba(255,255,255,0.14)]">
              <div />
              <ColHeader
                title={`Week ${fromCheckin.week_number}`}
                subtitle={formatDate(fromCheckin.created_at)}
                onExpand={() => setExpanded(fromCheckin)}
              />
              <ColHeader
                title={`Week ${toCheckin.week_number}`}
                subtitle={formatDate(toCheckin.created_at)}
                onExpand={() => setExpanded(toCheckin)}
              />
            </div>

            {FIELD_LAYOUT.map((section) => (
              <div key={section.section} className="mb-6 last:mb-0">
                <p className="text-xs text-[#a8a49c] tracking-widest uppercase mb-3 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                  {section.section}
                </p>
                <div className="flex flex-col gap-2.5">
                  {section.fields.map((field) => {
                    const fromVal = fromCheckin.payload[field.key]
                    const toVal = toCheckin.payload[field.key]
                    return (
                      <div key={field.key} className="grid grid-cols-[160px_1fr_1fr] gap-4 items-start">
                        <span className="text-xs text-[#b8b4ac] pt-1.5">{field.label}</span>
                        <Cell value={fromVal} />
                        <Cell value={toVal} />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Expand-one-checkin modal */}
      <Modal
        open={!!expanded}
        onClose={() => setExpanded(null)}
        title={expanded ? `Week ${expanded.week_number}, ${formatDate(expanded.created_at)}` : ''}
      >
        {expanded && (
          <div className="flex flex-col gap-5">
            {FIELD_LAYOUT.map((section) => (
              <div key={section.section}>
                <p className="text-xs text-[#a8a49c] tracking-widest uppercase mb-2 pb-1.5 border-b border-[rgba(255,255,255,0.08)]">
                  {section.section}
                </p>
                <div className="flex flex-col gap-2">
                  {section.fields.map((field) => {
                    const val = expanded.payload[field.key]
                    if (val == null || val === '') return null
                    return (
                      <div key={field.key} className="flex items-start gap-3">
                        <span className="text-xs text-[#b8b4ac] w-44 flex-shrink-0 pt-0.5">{field.label}</span>
                        <span className="text-sm text-[#f0ece4] leading-relaxed flex-1">{String(val)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

function ColHeader({ title, subtitle, onExpand }: { title: string; subtitle: string; onExpand: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-sm font-medium text-[#f0ece4]">{title}</p>
        <p className="text-xs text-[#a8a49c]">{subtitle}</p>
      </div>
      <button
        onClick={onExpand}
        className="text-[#b8b4ac] hover:text-[#f0ece4] transition-colors p-1 -m-1"
        title="Expand this check-in"
        aria-label="Expand"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1.5C4 1.5 1.5 5 1.5 8s2.5 6.5 6.5 6.5S14.5 11 14.5 8 12 1.5 8 1.5z" />
        </svg>
      </button>
    </div>
  )
}

function Cell({ value }: { value: unknown }) {
  if (value == null || value === '') {
    return <span className="text-sm text-[#6b6764] italic">—</span>
  }
  return <span className="text-sm text-[#f0ece4] leading-relaxed">{String(value)}</span>
}
