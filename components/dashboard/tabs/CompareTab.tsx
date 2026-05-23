'use client'

import { useState } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
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

  function toggleArea(key: string) {
    setAreas((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    )
  }

  async function generate() {
    const fromCheckin = checkins.find((c) => c.id === fromId)
    const toCheckin = checkins.find((c) => c.id === toId)
    if (!fromCheckin || !toCheckin) return

    setGenerating(true)
    setError('')
    setDraft('')

    try {
      const res = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.full_name,
          clientGoal: client.goal || '',
          fromCheckin,
          toCheckin,
          areas,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDraft(data.draft)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate.')
    } finally {
      setGenerating(false)
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (checkins.length < 2) {
    return (
      <div className="text-center py-20 text-[#6b6764] text-sm">
        At least 2 check-ins are needed to compare.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <span className="text-xs text-[#6b6764] tracking-widest uppercase">Select check-ins to compare</span>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#6b6764] tracking-widest uppercase mb-1.5 block">From</label>
              <select
                className="input-underline text-sm"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
              >
                {checkins.map((c) => (
                  <option key={c.id} value={c.id}>
                    Week {c.week_number} — {formatDate(c.created_at)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#6b6764] tracking-widest uppercase mb-1.5 block">To</label>
              <select
                className="input-underline text-sm"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
              >
                {checkins.map((c) => (
                  <option key={c.id} value={c.id}>
                    Week {c.week_number} — {formatDate(c.created_at)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Area toggles */}
          <div>
            <p className="text-xs text-[#6b6764] tracking-widest uppercase mb-3">Include areas</p>
            <div className="flex flex-wrap gap-2">
              {AREA_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleArea(key)}
                  className={`text-xs px-3 py-1.5 border rounded-sm transition-colors ${
                    areas.includes(key)
                      ? 'border-[rgba(240,236,228,0.3)] text-[#f0ece4] bg-[rgba(240,236,228,0.05)]'
                      : 'border-[rgba(255,255,255,0.07)] text-[#6b6764]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generate} loading={generating} className="self-start">
            Generate feedback draft
          </Button>
        </CardBody>
      </Card>

      {error && <p className="text-sm text-[#b06060]">{error}</p>}

      {draft && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6b6764] tracking-widest uppercase">AI draft — review and edit before sending</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={generate} loading={generating}>
                  Regenerate
                </Button>
                <Button size="sm" onClick={copyToClipboard}>
                  {copied ? 'Copied' : 'Approve & copy'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <textarea
              className="input-underline text-sm leading-relaxed w-full"
              rows={12}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <p className="text-xs text-[#4a4744] mt-3 leading-relaxed">
              AI draft based on evidence-based guidelines. Always review and edit before sending — your clinical judgement applies.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
