'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import CopyLink from '@/components/ui/CopyLink'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { shortDayLabel, weekLabel } from '@/lib/diet-week'
import type { Client, DietSubmission } from '@/types'

interface Props {
  client: Client
  submissions: DietSubmission[]
}

const SECTION_LABELS = [
  { key: 'breakfast' as const, label: 'Breakfast' },
  { key: 'lunch' as const,     label: 'Lunch' },
  { key: 'dinner' as const,    label: 'Dinner' },
  { key: 'snacks' as const,    label: 'Snacks' },
  { key: 'drinks' as const,    label: 'Drinks' },
]

export default function DietTab({ client, submissions }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(submissions[0]?.id ?? null)
  const [drafting, setDrafting] = useState<Record<string, boolean>>({})
  const [revising, setRevising] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({}) // id -> current advice text
  const [reviseInputs, setReviseInputs] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://meal-generator-murex.vercel.app')
  const clientLink = `${baseUrl}/diet?email=${encodeURIComponent(client.email)}`

  function getAdvice(sub: DietSubmission): string {
    return drafts[sub.id] ?? sub.ai_advice ?? ''
  }

  async function draftAdvice(sub: DietSubmission) {
    setDrafting((s) => ({ ...s, [sub.id]: true }))
    setErrors((e) => ({ ...e, [sub.id]: '' }))
    try {
      const res = await fetch('/api/ai/diet-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, dietSubmissionId: sub.id, mode: 'draft' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Draft failed.')
      setDrafts((d) => ({ ...d, [sub.id]: data.advice as string }))
    } catch (err: unknown) {
      setErrors((e) => ({ ...e, [sub.id]: err instanceof Error ? err.message : 'Draft failed.' }))
    } finally {
      setDrafting((s) => ({ ...s, [sub.id]: false }))
    }
  }

  async function reviseAdvice(sub: DietSubmission) {
    const instructions = (reviseInputs[sub.id] ?? '').trim()
    if (!instructions) return
    setRevising((s) => ({ ...s, [sub.id]: true }))
    setErrors((e) => ({ ...e, [sub.id]: '' }))
    try {
      const res = await fetch('/api/ai/diet-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          dietSubmissionId: sub.id,
          mode: 'revise',
          currentDraft: getAdvice(sub),
          instructions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Revise failed.')
      setDrafts((d) => ({ ...d, [sub.id]: data.advice as string }))
      setReviseInputs((r) => ({ ...r, [sub.id]: '' }))
    } catch (err: unknown) {
      setErrors((e) => ({ ...e, [sub.id]: err instanceof Error ? err.message : 'Revise failed.' }))
    } finally {
      setRevising((s) => ({ ...s, [sub.id]: false }))
    }
  }

  async function saveAdvice(sub: DietSubmission) {
    const advice = getAdvice(sub)
    setSaving((s) => ({ ...s, [sub.id]: true }))
    const supabase = createBrowserClient()
    await supabase.from('diet_submissions').update({ ai_advice: advice || null }).eq('id', sub.id)
    setSaving((s) => ({ ...s, [sub.id]: false }))
    router.refresh()
  }

  async function copyAdvice(sub: DietSubmission) {
    const advice = getAdvice(sub)
    if (!advice) return
    await navigator.clipboard.writeText(advice)
    setCopied((c) => ({ ...c, [sub.id]: true }))
    setTimeout(() => setCopied((c) => ({ ...c, [sub.id]: false })), 2000)
  }

  // Generate a coach-branded PDF: personal note (Jess's edited advice)
  // at the top, the client's food week below as reference. Saves the
  // current draft first so the PDF and the on-file note match. Opens
  // the native share sheet so Jess can send via WhatsApp / email in
  // one tap. The PDF has NO mention of AI anywhere on it.
  async function exportAdvicePdf(sub: DietSubmission) {
    const advice = getAdvice(sub)
    if (!advice) return
    setSaving((s) => ({ ...s, [sub.id]: true }))
    setErrors((e) => ({ ...e, [sub.id]: '' }))
    try {
      await saveAdvice(sub)
      const res = await fetch('/api/pdf/diet-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dietSubmissionId: sub.id, advice }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't make the PDF.")
      const pdfUrl = data.pdf_url as string

      const firstName = client.full_name.split(' ')[0] || 'there'
      const message = `Hi ${firstName}, this week's note plus your food for reference:\n\n${pdfUrl}`
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          await navigator.share({ title: `Your week review, ${weekLabel(sub.week_start)}`, text: message, url: pdfUrl })
          return
        } catch {
          // user cancelled or share unavailable, fall through
        }
      }
      if (typeof window !== 'undefined') window.open(pdfUrl, '_blank', 'noopener')
    } catch (err: unknown) {
      setErrors((e) => ({ ...e, [sub.id]: err instanceof Error ? err.message : 'Failed to export.' }))
    } finally {
      setSaving((s) => ({ ...s, [sub.id]: false }))
    }
  }

  async function shareAdvice(sub: DietSubmission) {
    const advice = getAdvice(sub)
    if (!advice) return
    // Send always saves the draft first so what Jess sends and what
    // sits on the file are the same. saveAdvice already handles the
    // supabase update + router.refresh; running it before opening the
    // share sheet means the file never disagrees with the message.
    await saveAdvice(sub)
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        const firstName = client.full_name.split(' ')[0] || 'there'
        await navigator.share({
          title: `Your food week, ${weekLabel(sub.week_start)}`,
          text: `Hi ${firstName}, quick thoughts on your food this week.\n\n${advice}\n\nJess`,
        })
        return
      } catch {
        // fall through
      }
    }
    await copyAdvice(sub)
  }

  /** Human-friendly "2h ago" style time for the timestamps line. */
  function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime()
    if (ms < 60_000) return 'just now'
    const min = Math.floor(ms / 60_000)
    if (min < 60) return `${min} min ago`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d}d ago`
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  function fullStamp(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header + share link */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-1">Their diet</p>
            <p className="text-sm text-[#e0d8cc] leading-relaxed">
              A weekly food tracker your client fills in through their own link. Photos welcome. Their entries land here for you to read and get an AI first draft of advice.
            </p>
          </div>
          <CopyLink
            label="Their personal food-tracker link"
            url={clientLink}
            hint="Send this to your client. It stays the same every week; whichever week they open it in, that week's form loads. They can come back and edit until the next Monday."
          />
        </CardBody>
      </Card>

      {/* Week submissions list */}
      {submissions.length === 0 ? (
        <div className="text-center py-16 text-[#b8b4ac] text-sm italic">
          Nothing submitted yet. Share the link above with your client.
        </div>
      ) : (
        submissions.map((sub) => {
          const isOpen = expanded === sub.id
          const currentAdvice = getAdvice(sub)
          return (
            <Card key={sub.id}>
              <button
                className="w-full flex items-start justify-between px-5 py-4 text-left gap-3"
                onClick={() => setExpanded(isOpen ? null : sub.id)}
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#f0ece4]">{weekLabel(sub.week_start)}</span>
                    {sub.photos.length > 0 && (
                      <span className="text-xs text-[#c89a6a]">{sub.photos.length} photo{sub.photos.length === 1 ? '' : 's'}</span>
                    )}
                    {(() => {
                      const editedAt = new Date(sub.updated_at).getTime()
                      const dayMs = 24 * 60 * 60 * 1000
                      if (Date.now() - editedAt < dayMs) {
                        return <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-[#7da87d] text-[#7da87d]">Fresh edit</span>
                      }
                      return null
                    })()}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-[#8a8680]">
                    <span title={fullStamp(sub.created_at)}>First saved: {new Date(sub.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    <span title={fullStamp(sub.updated_at)}>Last edit: {timeAgo(sub.updated_at)} ({fullStamp(sub.updated_at)})</span>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" className={`transition-transform mt-1 flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}>
                  <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 flex flex-col gap-5 border-t border-[rgba(255,255,255,0.14)]">
                  {/* Photos */}
                  {sub.photos.length > 0 && (
                    <div className="pt-4">
                      <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">Photos</p>
                      <div className="grid grid-cols-3 gap-2">
                        {sub.photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square border border-[rgba(255,255,255,0.14)] rounded-sm overflow-hidden hover:border-[rgba(255,255,255,0.3)] transition-colors">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Food ${i + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Day entries */}
                  <div className="pt-4 flex flex-col gap-4">
                    {sub.payload.days
                      .filter((d) => SECTION_LABELS.some((s) => (d[s.key] as string | undefined)?.trim()))
                      .map((d) => (
                        <div key={d.date} className="border-l-2 border-[rgba(255,255,255,0.14)] pl-4">
                          <p className="text-xs text-[#c89a6a] tracking-wider uppercase mb-2">{shortDayLabel(d.date)}</p>
                          {SECTION_LABELS.map((s) => {
                            const val = (d[s.key] as string | undefined)?.trim()
                            if (!val) return null
                            return (
                              <div key={s.key} className="mb-2">
                                <p className="text-xs text-[#b8b4ac] mb-0.5">{s.label}</p>
                                <p className="text-sm text-[#e0d8cc] leading-relaxed whitespace-pre-wrap">{val}</p>
                              </div>
                            )
                          })}
                        </div>
                      ))}

                    {/* No-data hint */}
                    {sub.payload.days.every((d) => !SECTION_LABELS.some((s) => (d[s.key] as string | undefined)?.trim())) && (
                      <p className="text-xs text-[#8a8680] italic">No food entries yet this week.</p>
                    )}
                  </div>

                  {/* Weekly note */}
                  {sub.payload.notes && (
                    <div className="border-t border-[rgba(255,255,255,0.10)] pt-4">
                      <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-1">Note from client</p>
                      <p className="text-sm text-[#e0d8cc] leading-relaxed whitespace-pre-wrap">{sub.payload.notes}</p>
                    </div>
                  )}

                  {/* AI advice */}
                  <div className="border-t border-[rgba(255,255,255,0.14)] pt-4">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <p className="text-xs text-[#b8b4ac] tracking-widest uppercase">AI-drafted advice</p>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" loading={drafting[sub.id]} onClick={() => draftAdvice(sub)}>
                          {currentAdvice ? 'Regenerate' : 'Draft advice'}
                        </Button>
                        {currentAdvice && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => copyAdvice(sub)}>
                              {copied[sub.id] ? 'Copied' : 'Copy'}
                            </Button>
                            <Button size="sm" variant="outline" loading={saving[sub.id]} onClick={() => exportAdvicePdf(sub)}>
                              Save as PDF
                            </Button>
                            <Button size="sm" onClick={() => shareAdvice(sub)}>Send text</Button>
                          </>
                        )}
                      </div>
                    </div>

                    {errors[sub.id] && <p className="text-xs text-[#b06060] mb-2">{errors[sub.id]}</p>}

                    {currentAdvice ? (
                      <>
                        <textarea
                          className="input-underline text-sm leading-relaxed w-full"
                          rows={10}
                          value={currentAdvice}
                          onChange={(e) => setDrafts((d) => ({ ...d, [sub.id]: e.target.value }))}
                        />
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={saving[sub.id]}
                            onClick={() => saveAdvice(sub)}
                          >
                            Save draft
                          </Button>
                          <span className="text-xs text-[#8a8680] italic">Edits are yours until you save. Save keeps this draft on the file.</span>
                        </div>

                        {/* Ask AI to amend */}
                        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.10)]">
                          <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">Ask AI to amend</p>
                          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                            <input
                              className="input-underline text-sm"
                              value={reviseInputs[sub.id] ?? ''}
                              placeholder={'e.g. "make it warmer", "focus on her sleep this week", "shorter"'}
                              onChange={(e) => setReviseInputs((r) => ({ ...r, [sub.id]: e.target.value }))}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              loading={revising[sub.id]}
                              disabled={!((reviseInputs[sub.id] ?? '').trim())}
                              onClick={() => reviseAdvice(sub)}
                            >
                              Amend
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-[#8a8680] italic leading-relaxed">
                        Click Draft advice. AI reads their week + goal + macros + your notes and gives you a first pass in your voice. You edit before sending.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
