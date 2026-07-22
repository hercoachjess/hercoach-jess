'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { GUIDES } from '@/lib/guides'
import type { PdfEnquiry } from '@/types'

const STATUS_FILTERS = ['new', 'contacted', 'sent', 'closed'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

const STATUS_LABEL: Record<StatusFilter, string> = {
  new: 'New',
  contacted: 'Contacted',
  sent: 'Sent',
  closed: 'Closed',
}

function guidePrice(name: string): string {
  return GUIDES.find((g) => g.name === name)?.price ?? ''
}

function statusBadgeVariant(s: PdfEnquiry['status']): 'active' | 'paused' | 'paid' | 'default' {
  if (s === 'new') return 'active'
  if (s === 'contacted') return 'paused'
  if (s === 'sent') return 'paid'
  return 'default'
}

export default function PdfEnquiriesSection({ enquiries }: { enquiries: PdfEnquiry[] }) {
  const router = useRouter()
  const [filters, setFilters] = useState<Set<StatusFilter>>(new Set(['new', 'contacted']))
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState('')

  function toggleFilter(s: StatusFilter) {
    setFilters((prev) => {
      const next = new Set(prev)
      if (next.has(s)) {
        if (next.size > 1) next.delete(s)
      } else {
        next.add(s)
      }
      return next
    })
  }

  const visible = useMemo(() => enquiries.filter((e) => filters.has(e.status)), [enquiries, filters])
  const newCount = enquiries.filter((e) => e.status === 'new').length

  async function setStatus(enq: PdfEnquiry, status: PdfEnquiry['status']) {
    setError('')
    const supabase = createClient()
    const { error: e } = await supabase.from('pdf_enquiries').update({ status }).eq('id', enq.id)
    if (e) { setError(`Couldn't update: ${e.message}`); return }
    router.refresh()
  }

  if (enquiries.length === 0) return null

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm text-[#e0d8cc] tracking-widest uppercase">Guide enquiries</h2>
          {newCount > 0 && <Badge variant="active">{newCount} new</Badge>}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((s) => {
            const on = filters.has(s)
            return (
              <button
                key={s}
                onClick={() => toggleFilter(s)}
                className={`px-3 py-2 text-xs tracking-widest uppercase border rounded-sm transition-colors whitespace-nowrap ${
                  on
                    ? 'border-[rgba(255,255,255,0.3)] text-[#f0ece4] bg-[rgba(255,255,255,0.06)]'
                    : 'border-[rgba(255,255,255,0.14)] text-[#b8b4ac] hover:text-[#e0d8cc]'
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-sm text-[#b06060] mb-3">{error}</p>}

      {visible.length === 0 ? (
        <div className="text-center py-8 text-[#b8b4ac] text-sm bg-[#0e0e0e] border border-[rgba(255,255,255,0.14)] rounded-sm">
          No guide enquiries match these filters.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((enq) => {
            const isOpen = expanded === enq.id
            return (
              <Card key={enq.id}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
                  onClick={() => setExpanded(isOpen ? null : enq.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge variant={statusBadgeVariant(enq.status)} dot>{STATUS_LABEL[enq.status]}</Badge>
                    <span className="text-sm font-medium text-[#f0ece4] truncate">{enq.name}</span>
                    <span className="text-xs text-[#8a8680] truncate hidden md:inline">· {enq.guide}</span>
                    <span className="text-xs text-[#b8b4ac] whitespace-nowrap hidden sm:inline">{formatDate(enq.created_at)}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                    <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 flex flex-col gap-4 border-t border-[rgba(255,255,255,0.14)]">
                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      <Row label="Guide" value={`${enq.guide}${guidePrice(enq.guide) ? ` · ${guidePrice(enq.guide)}` : ''}`} />
                      <Row label="Submitted" value={formatDate(enq.created_at)} />
                      <Row label="Email" value={enq.email} />
                      {enq.phone && <Row label="Phone / WhatsApp" value={enq.phone} />}
                    </div>

                    {enq.message && (
                      <div>
                        <p className="text-xs text-[#b8b4ac] tracking-wider uppercase mb-1">Message</p>
                        <p className="text-sm text-[#e0d8cc] leading-relaxed">{enq.message}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {enq.phone && (
                        <a
                          href={whatsAppHref(enq)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 text-xs tracking-widest uppercase border border-[rgba(255,255,255,0.24)] rounded-sm text-[#e0d8cc] hover:border-[rgba(255,255,255,0.4)] transition-colors"
                        >
                          WhatsApp them
                        </a>
                      )}
                      <a
                        href={mailHref(enq)}
                        className="px-3 py-2 text-xs tracking-widest uppercase border border-[rgba(255,255,255,0.24)] rounded-sm text-[#e0d8cc] hover:border-[rgba(255,255,255,0.4)] transition-colors"
                      >
                        Email them
                      </a>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {enq.status === 'new' && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(enq, 'contacted')}>Mark contacted</Button>
                      )}
                      {enq.status !== 'sent' && enq.status !== 'closed' && (
                        <Button size="sm" onClick={() => setStatus(enq, 'sent')}>Mark sent</Button>
                      )}
                      {enq.status !== 'closed' && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(enq, 'closed')}>Close</Button>
                      )}
                      {enq.status === 'closed' && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(enq, 'new')}>Re-open</Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#b8b4ac] mb-0.5">{label}</p>
      <p className="text-sm text-[#e0d8cc] break-words">{value}</p>
    </div>
  )
}

function guideMessage(enq: PdfEnquiry): string {
  const price = guidePrice(enq.guide)
  const first = enq.name.split(' ')[0] || enq.name
  return `Hi ${first}, thanks for wanting the ${enq.guide}${price ? ` (${price})` : ''}! To grab it, you can pay by [add your payment link / bank details] and I'll send the PDF straight over. Any questions, just shout. Jess`
}

function whatsAppHref(enq: PdfEnquiry): string {
  const digits = (enq.phone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '')
  const text = encodeURIComponent(guideMessage(enq))
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`
}

function mailHref(enq: PdfEnquiry): string {
  const subject = encodeURIComponent(`Your ${enq.guide}`)
  const body = encodeURIComponent(guideMessage(enq))
  return `mailto:${enq.email}?subject=${subject}&body=${body}`
}
