'use client'

import { useState } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import type { Client, CheckinSubmission } from '@/types'

interface Props {
  checkins: CheckinSubmission[]
  client: Client
}

/**
 * The client's feedback "journey": every check-in that has saved coach
 * feedback, newest first, each re-downloadable as a branded PDF. The feedback
 * text is authored + saved on the Check-ins tab; here it's the archive.
 */
export default function FeedbackHistoryTab({ checkins, client }: Props) {
  const withFeedback = checkins.filter((c) => (c.coach_feedback ?? '').trim().length > 0)
  const [busy, setBusy] = useState<Record<string, 'pdf' | 'copy' | null>>({})
  const [error, setError] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  async function downloadPdf(checkin: CheckinSubmission) {
    setBusy((b) => ({ ...b, [checkin.id]: 'pdf' }))
    setError((e) => ({ ...e, [checkin.id]: '' }))
    try {
      const res = await fetch('/api/pdf/checkin-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, checkinId: checkin.id, feedback: checkin.coach_feedback }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Export failed.' }))
        throw new Error(data.error || 'Export failed.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const safe = (client.full_name || 'client').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      a.href = url
      a.download = `${safe}-checkin-feedback-week-${checkin.week_number ?? 'x'}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError((er) => ({ ...er, [checkin.id]: e instanceof Error ? e.message : 'Export failed.' }))
    } finally {
      setBusy((b) => ({ ...b, [checkin.id]: null }))
    }
  }

  async function copyText(checkin: CheckinSubmission) {
    try {
      await navigator.clipboard.writeText(checkin.coach_feedback ?? '')
      setCopied((c) => ({ ...c, [checkin.id]: true }))
      setTimeout(() => setCopied((c) => ({ ...c, [checkin.id]: false })), 2000)
    } catch {
      setError((er) => ({ ...er, [checkin.id]: 'Could not copy.' }))
    }
  }

  if (withFeedback.length === 0) {
    return (
      <div className="text-center py-16 text-[#b8b4ac] text-sm leading-relaxed max-w-md mx-auto">
        No saved feedback yet.<br />
        Open a check-in on the <span className="text-[#e0d8cc]">Check-ins</span> tab, write or generate the
        feedback, and hit <span className="text-[#e0d8cc]">Save</span> — every saved note appears here as your
        client&apos;s feedback journey.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[#8a8680] italic leading-relaxed">
        Every piece of feedback you&apos;ve saved for {client.full_name.split(' ')[0]}, newest first. Re-download any as a
        branded PDF to re-share. Edit them on the Check-ins tab.
      </p>
      {withFeedback.map((checkin) => {
        const text = (checkin.coach_feedback ?? '').trim()
        const preview = text.length > 260 ? text.slice(0, 260).trimEnd() + '…' : text
        return (
          <Card key={checkin.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-[#f0ece4]">Week {checkin.week_number ?? '—'}</span>
                  <span className="text-xs text-[#b8b4ac]">{formatDate(checkin.created_at)}</span>
                  {checkin.feedback_updated_at && (
                    <span className="text-xs text-[#8a8680] italic">Saved {formatDate(checkin.feedback_updated_at)}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => copyText(checkin)}>
                    {copied[checkin.id] ? 'Copied' : 'Copy text'}
                  </Button>
                  <Button size="sm" variant="outline" loading={busy[checkin.id] === 'pdf'} onClick={() => downloadPdf(checkin)}>
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {error[checkin.id] && <p className="text-xs text-[#b06060] mb-2">{error[checkin.id]}</p>}
              <p className="text-sm text-[#c8c4bc] leading-relaxed whitespace-pre-line">{preview}</p>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
