'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Enquiry } from '@/types'

interface Props {
  enquiries: Enquiry[]
  onboardingUrl: string
}

const STATUS_FILTERS = ['new', 'contacted', 'converted', 'closed'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

const STATUS_LABEL: Record<StatusFilter, string> = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted',
  closed: 'Closed',
}

export default function EnquiriesSection({ enquiries, onboardingUrl }: Props) {
  const router = useRouter()
  // Default view: anything still active (new + contacted). Converted / closed
  // are hidden until the coach toggles them on.
  const [filters, setFilters] = useState<Set<StatusFilter>>(new Set(['new', 'contacted']))
  const [expanded, setExpanded] = useState<string | null>(null)
  const [contactModal, setContactModal] = useState<Enquiry | null>(null)
  const [contactNotes, setContactNotes] = useState('')
  const [saving, setSaving] = useState(false)
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

  const visible = useMemo(
    () => enquiries.filter((e) => filters.has(e.status)),
    [enquiries, filters],
  )

  const newCount = enquiries.filter((e) => e.status === 'new').length

  async function markContacted(enquiry: Enquiry, notes: string) {
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: e } = await supabase
      .from('enquiries')
      .update({
        status: 'contacted',
        contacted_at: new Date().toISOString(),
        coach_notes: notes.trim() || enquiry.coach_notes,
      })
      .eq('id', enquiry.id)
    setSaving(false)
    if (e) { setError(e.message); return }
    setContactModal(null)
    setContactNotes('')
    router.refresh()
  }

  async function setStatus(enquiry: Enquiry, status: Enquiry['status']) {
    const supabase = createClient()
    await supabase.from('enquiries').update({ status }).eq('id', enquiry.id)
    router.refresh()
  }

  function statusBadgeVariant(s: Enquiry['status']): 'active' | 'paused' | 'paid' | 'default' {
    if (s === 'new') return 'active'
    if (s === 'contacted') return 'paused'
    if (s === 'converted') return 'paid'
    return 'default'
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm text-[#e0d8cc] tracking-widest uppercase">Coaching enquiries</h2>
          {newCount > 0 && (
            <Badge variant="active">
              {newCount} new
            </Badge>
          )}
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

      {visible.length === 0 ? (
        <div className="text-center py-8 text-[#b8b4ac] text-sm bg-[#0e0e0e] border border-[rgba(255,255,255,0.14)] rounded-sm">
          {enquiries.length === 0
            ? 'No enquiries yet. Share your enquiry link and they\'ll land here.'
            : 'No enquiries match these filters.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((enq) => {
            const isOpen = expanded === enq.id
            const fullName = [enq.first_name, enq.last_name].filter(Boolean).join(' ')
            return (
              <Card key={enq.id}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
                  onClick={() => setExpanded(isOpen ? null : enq.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge variant={statusBadgeVariant(enq.status)} dot>{STATUS_LABEL[enq.status]}</Badge>
                    <span className="text-sm font-medium text-[#f0ece4] truncate">{fullName}</span>
                    <span className="text-xs text-[#b8b4ac] whitespace-nowrap hidden sm:inline">{formatDate(enq.created_at)}</span>
                    {enq.goal && (
                      <span className="text-xs text-[#8a8680] truncate hidden md:inline">· {enq.goal}</span>
                    )}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                    <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 flex flex-col gap-4 border-t border-[rgba(255,255,255,0.14)]">
                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      <Row label="Submitted" value={formatDate(enq.created_at)} />
                      <Row label="Email" value={enq.email} />
                      {enq.phone && <Row label="Phone / WhatsApp" value={enq.phone} />}
                      {enq.goal && <Row label="Goal" value={enq.goal} />}
                      {enq.hear_from && <Row label="Found me via" value={enq.hear_from} />}
                      {enq.best_contact && <Row label="Best contact" value={enq.best_contact} />}
                      {enq.contacted_at && <Row label="Contacted" value={formatDate(enq.contacted_at)} />}
                    </div>

                    {enq.about && (
                      <div>
                        <p className="text-xs text-[#b8b4ac] tracking-wider uppercase mb-1">Where they&apos;re at</p>
                        <p className="text-sm text-[#e0d8cc] leading-relaxed">{enq.about}</p>
                      </div>
                    )}

                    {enq.coach_notes && (
                      <div>
                        <p className="text-xs text-[#b8b4ac] tracking-wider uppercase mb-1">Your notes</p>
                        <p className="text-sm text-[#e0d8cc] leading-relaxed italic">{enq.coach_notes}</p>
                      </div>
                    )}

                    {/* Quick contact links — mobile-first */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {enq.phone && (
                        <a
                          href={whatsAppHref(enq, onboardingUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 text-xs tracking-widest uppercase border border-[rgba(255,255,255,0.24)] rounded-sm text-[#e0d8cc] hover:border-[rgba(255,255,255,0.4)] transition-colors"
                        >
                          WhatsApp + onboarding link
                        </a>
                      )}
                      <a
                        href={mailHref(enq, onboardingUrl)}
                        className="px-3 py-2 text-xs tracking-widest uppercase border border-[rgba(255,255,255,0.24)] rounded-sm text-[#e0d8cc] hover:border-[rgba(255,255,255,0.4)] transition-colors"
                      >
                        Email + onboarding link
                      </a>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {enq.status !== 'contacted' && enq.status !== 'converted' && (
                        <Button size="sm" variant="outline" onClick={() => { setContactNotes(enq.coach_notes || ''); setContactModal(enq) }}>
                          Mark contacted
                        </Button>
                      )}
                      {enq.status !== 'closed' && enq.status !== 'converted' && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(enq, 'closed')}>
                          Close enquiry
                        </Button>
                      )}
                      {enq.status === 'closed' && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(enq, 'new')}>
                          Re-open
                        </Button>
                      )}
                    </div>

                    {enq.client_id && (
                      <p className="text-xs text-[#7da87d] italic">
                        ✓ Linked to a client record — they&apos;ve filled the onboarding form.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Mark contacted modal — captures notes from the conversation */}
      <Modal
        open={!!contactModal}
        onClose={() => { setContactModal(null); setContactNotes('') }}
        title={contactModal ? `Mark ${contactModal.first_name} as contacted` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setContactModal(null); setContactNotes('') }}>Cancel</Button>
            <Button onClick={() => contactModal && markContacted(contactModal, contactNotes)} loading={saving}>
              Save & mark contacted
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#e0d8cc] leading-relaxed">
            Captures the date you reached out and a short note on what you discussed — visible on the enquiry record.
          </p>
          <div>
            <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Notes (optional)</label>
            <textarea
              className="input-underline text-sm"
              rows={4}
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder="What you discussed, when you'll follow up, anything to remember..."
            />
          </div>
          {error && <p className="text-sm text-[#b06060]">{error}</p>}
        </div>
      </Modal>
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

function templatedMessage(enq: Enquiry, onboardingUrl: string): string {
  return `Hi ${enq.first_name} — thanks for reaching out. I've read what you sent and I'd love to chat properly about whether we'd be a good fit.

When you're ready, my onboarding form is here — it's about 5–8 minutes and gives me everything I need to design a plan around you:
${onboardingUrl}

Any questions before you fill it in, just shout. — Jess`
}

function whatsAppHref(enq: Enquiry, onboardingUrl: string): string {
  const message = templatedMessage(enq, onboardingUrl)
  const digits = (enq.phone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '')
  return digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`
}

function mailHref(enq: Enquiry, onboardingUrl: string): string {
  const message = templatedMessage(enq, onboardingUrl)
  return `mailto:${enq.email}?subject=${encodeURIComponent(`Following up on your coaching enquiry, ${enq.first_name}`)}&body=${encodeURIComponent(message)}`
}
