'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { safeSubmit } from '@/lib/safe-submit'
import { currentWeekStart, emptyWeekDays, shortDayLabel, weekLabel } from '@/lib/diet-week'
import type { DietDay, DietPayload } from '@/types'

/**
 * Public weekly food tracker form.
 *
 * Dark theme to match the check-in form. The current week form sits at
 * the top; below it, "Your previous weeks" lists every week the client
 * has ever submitted, each collapsible and fully editable inline with
 * its own save + resend controls. Clients can go back weeks or months
 * later to amend an old entry (typo, forgot a snack) and re-send.
 */
const SECTION_FIELDS = [
  { key: 'breakfast', label: 'Breakfast', placeholder: 'e.g. 80g oats with milk and berries' },
  { key: 'lunch',     label: 'Lunch',     placeholder: 'e.g. chicken salad, olive oil, seeds' },
  { key: 'dinner',    label: 'Dinner',    placeholder: 'e.g. salmon, potatoes, greens' },
  { key: 'snacks',    label: 'Small meals / snacks', placeholder: 'e.g. apple, handful of almonds, protein bar' },
  { key: 'drinks',    label: 'Fluid / drinks', placeholder: 'e.g. 2L water, one coffee, glass of wine Sat' },
] as const

type SectionKey = typeof SECTION_FIELDS[number]['key']

interface PastWeek {
  id: string
  week_start: string
  payload: DietPayload
  photos: string[]
  updated_at: string
  created_at: string
}

export default function DietForm({ initialEmail }: { initialEmail: string }) {
  const weekStart = useMemo(() => currentWeekStart(), [])
  const [name, setName] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [notes, setNotes] = useState('')
  const [days, setDays] = useState<DietDay[]>(() => emptyWeekDays(weekStart))
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPaths, setPhotoPaths] = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')

  // Previous weeks the client has submitted before this one.
  const [pastWeeks, setPastWeeks] = useState<PastWeek[]>([])

  const loadExisting = useCallback(async () => {
    if (!email.trim()) return
    setLoadingExisting(true)
    try {
      const [thisWeekRes, allRes] = await Promise.all([
        fetch(`/api/diet?email=${encodeURIComponent(email.trim())}&week_start=${weekStart}`),
        fetch(`/api/diet?email=${encodeURIComponent(email.trim())}&all=1`),
      ])

      if (thisWeekRes.ok) {
        const data = await thisWeekRes.json() as { payload?: DietPayload; photos?: string[] } | null
        if (data?.payload) {
          if (data.payload.name) setName(data.payload.name)
          if (data.payload.notes) setNotes(data.payload.notes)
          if (Array.isArray(data.payload.days) && data.payload.days.length > 0) {
            const byDate = new Map(data.payload.days.map((d) => [d.date, d] as const))
            setDays((prev) => prev.map((d) => byDate.get(d.date) ?? d))
          }
        }
        if (Array.isArray(data?.photos)) setPhotoPaths(data.photos)
      }

      if (allRes.ok) {
        const data = await allRes.json() as { weeks?: PastWeek[] }
        const weeks = (data.weeks ?? []).filter((w) => w.week_start !== weekStart)
        setPastWeeks(weeks)
      }
    } finally {
      setLoadingExisting(false)
    }
  }, [email, weekStart])

  useEffect(() => {
    loadExisting()
  }, [loadExisting])

  function updateDay(idx: number, field: SectionKey, value: string) {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)))
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setPhotoUploading(true); setPhotoError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('checkin-photos')
          .upload(path, file, { contentType: file.type, upsert: false })
        if (uploadErr) { setPhotoError(uploadErr.message); continue }
        uploaded.push(path)
      }
      setPhotoFiles((prev) => [...prev, ...Array.from(files)])
      setPhotoPaths((prev) => [...prev, ...uploaded])
    } catch (e: unknown) {
      setPhotoError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setPhotoUploading(false)
    }
  }

  function removePhoto(idx: number) {
    setPhotoPaths((prev) => prev.filter((_, i) => i !== idx))
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setError('Please add your name and the email address Jess has for you.')
      return
    }
    setSubmitting(true); setError('')
    const payload: DietPayload = {
      name: name.trim(),
      email: email.trim(),
      notes: notes.trim() || undefined,
      days,
    }
    const result = await safeSubmit('/api/diet', {
      payload,
      week_start: weekStart,
      photos: photoPaths,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSubmitted(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function shareWithJess(target: 'current' | { pastWeek: PastWeek }) {
    setSharing(true); setShareError('')
    try {
      if (target === 'current') {
        if (!name.trim() || !email.trim()) {
          setShareError('Please add your name and email first.')
          return
        }
        const payload: DietPayload = {
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim() || undefined,
          days,
        }
        await safeSubmit('/api/diet', { payload, week_start: weekStart, photos: photoPaths })

        await openPdfShare(weekStart, email.trim())
      } else {
        const w = target.pastWeek
        await openPdfShare(w.week_start, email.trim())
      }
    } catch (e: unknown) {
      setShareError(e instanceof Error ? e.message : 'Could not create the PDF.')
    } finally {
      setSharing(false)
    }
  }

  async function openPdfShare(wkStart: string, emailAddr: string) {
    const res = await fetch('/api/pdf/diet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddr, week_start: wkStart }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Could not create the PDF.')
    const pdfUrl = data.pdf_url as string
    const message = `Hi Jess, here's my food week for ${weekLabel(wkStart)}.\n\n${pdfUrl}`
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'My food week', text: message, url: pdfUrl })
        return
      } catch {
        // user cancelled or share unavailable
      }
    }
    if (typeof window !== 'undefined') window.open(pdfUrl, '_blank', 'noopener')
  }

  if (submitted) {
    return (
      <div className="bg-[#080808] min-h-screen relative" style={{ color: '#e0d8cc' }}>
        <div className="relative z-10 max-w-[640px] mx-auto px-7 pb-24">
          <div className="text-center py-20 fade-in">
            <span className="font-serif italic text-[60px] font-light text-[#f0ece4] block mb-6 opacity-30">✦</span>
            <h2 className="font-serif text-[34px] font-light text-[#f0ece4] mb-4 leading-[1.2]">
              Saved. Thank you.
            </h2>
            <p className="text-sm text-[#a8a49c] leading-[1.8] font-light max-w-[440px] mx-auto mb-6">
              Come back to the same link any time to add more, amend, or scroll back through previous weeks.
            </p>

            <div className="flex flex-col items-center gap-3 mb-6">
              <button
                onClick={() => shareWithJess('current')}
                disabled={sharing}
                className="bg-[#f0ece4] border-0 text-[#080808] px-[42px] py-3 text-[10px] font-medium tracking-[3px] uppercase cursor-pointer font-sans rounded-[2px] transition-all hover:bg-[#e8e0d4] disabled:opacity-50"
                style={{ touchAction: 'manipulation' }}
              >
                {sharing ? 'Preparing...' : 'Send my week to Jess'}
              </button>
              <p className="text-[11px] text-[#7a7670] italic font-serif max-w-[340px]">
                Creates a neat PDF of what you saved and opens your share sheet, WhatsApp, email, whichever you use.
              </p>
              {shareError && <p className="text-[11px] text-[#b06060]">{shareError}</p>}
            </div>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="text-[11px] text-[#a8a49c] tracking-[2px] uppercase underline"
              style={{ fontFamily: 'var(--font-jost), sans-serif', touchAction: 'manipulation' }}
            >
              Keep adding to my week
            </button>

            <span className="font-serif italic text-[17px] text-[#7a7670] block mt-12">
              Less restriction. More you.
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#080808] min-h-screen relative" style={{ fontFamily: 'var(--font-jost), sans-serif', color: '#e0d8cc' }}>
      <div className="relative z-10 max-w-[640px] mx-auto px-7 pb-24">
        {/* Hero */}
        <div className="pt-[72px] pb-[52px] text-center border-b border-[rgba(255,255,255,0.24)] mb-11">
          <span className="font-serif italic text-[38px] font-light text-[#f0ece4] tracking-[-1px] block leading-none">hercoach Jess</span>
          <div className="w-full h-px my-[9px] mb-2" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />
          <span className="text-[9px] tracking-[5px] uppercase text-[#7a7670] font-light block mb-[30px]">Less restriction. More you.</span>
          <div className="inline-block border border-[rgba(255,255,255,0.24)] rounded-[2px] px-4 py-[5px] text-[9px] tracking-[4px] uppercase text-[#a8a49c] mb-[22px]">
            Your food week
          </div>
          <h1 className="font-serif font-light text-[clamp(26px,5vw,38px)] text-[#f0ece4] tracking-[-0.5px] mb-3.5 leading-[1.2]">
            {weekLabel(weekStart)}
          </h1>
          <p className="text-[13px] text-[#a8a49c] leading-[1.85] font-light max-w-[440px] mx-auto">
            Fill in what you actually had, not what you wish you had. No judgement. It doesn&apos;t have to be perfect. Even patchy days help me support you well.
          </p>
        </div>

        {loadingExisting && (
          <p className="text-center text-xs italic text-[#7a7670] mb-4">
            Loading anything you&apos;ve already saved this week...
          </p>
        )}

        {/* Your details */}
        <Card>
          <CardLabel>Your details</CardLabel>
          <G2>
            <Field label="First name">
              <Input value={name} onChange={setName} placeholder="e.g. Sarah" autoComplete="given-name" />
            </Field>
            <Field label="Email (the one Jess has for you)">
              <Input type="email" value={email} onChange={setEmail} placeholder="you@email.com" autoComplete="email" inputMode="email" />
            </Field>
          </G2>
        </Card>

        {/* This week */}
        {days.map((day, i) => (
          <Card key={day.date}>
            <CardLabel>{shortDayLabel(day.date)}</CardLabel>
            {SECTION_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <Textarea
                  value={(day[f.key] as string | undefined) ?? ''}
                  onChange={(v) => updateDay(i, f.key, v)}
                  placeholder={f.placeholder}
                />
              </Field>
            ))}
          </Card>
        ))}

        {/* Weekly note */}
        <Card>
          <CardLabel>Anything else Jess should know</CardLabel>
          <Field label="Optional note">
            <Textarea
              value={notes}
              onChange={setNotes}
              placeholder="e.g. felt hungry mid-afternoons, work was manic Thurs, skipped dinner Fri"
            />
          </Field>
        </Card>

        {/* Photos */}
        <Card>
          <CardLabel>Photos (optional)</CardLabel>
          <p className="text-[12px] text-[#a8a49c] leading-[1.7] mb-4 font-light">
            Photos of what you had are a great shortcut. Snap the plate, the packet, the coffee, whatever. Sometimes it&apos;s quicker than typing and Jess can see portion sizes at a glance.
          </p>
          <label
            className="block text-center py-4 border-2 border-dashed border-[rgba(255,255,255,0.24)] rounded-sm cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.4)]"
            style={{ touchAction: 'manipulation' }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoUpload(e.target.files)}
              disabled={photoUploading}
            />
            <span className="text-[13px] text-[#a8a49c] font-light">
              {photoUploading ? 'Uploading...' : photoPaths.length > 0 ? 'Add more photos' : 'Add photos'}
            </span>
          </label>
          {photoError && <p className="text-[12px] text-[#b06060] mt-2">{photoError}</p>}
          {photoPaths.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photoPaths.map((path, i) => (
                <div key={i} className="relative">
                  <div className="aspect-square rounded-sm bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[11px] italic text-[#7a7670]">
                    {photoFiles[i]?.name?.split('.')[0]?.slice(0, 16) || `Photo ${i + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 text-white text-[11px]"
                    aria-label="Remove photo"
                    style={{ touchAction: 'manipulation' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {error && (
          <div className="text-center mb-5 px-4 py-3 bg-[rgba(176,96,96,0.08)] border border-[rgba(176,96,96,0.2)] rounded">
            <p className="text-xs text-[#b06060] font-light">{error}</p>
          </div>
        )}

        <div className="text-center mt-10">
          <button
            onClick={submit}
            disabled={submitting}
            className="bg-[#f0ece4] border-0 text-[#080808] px-[52px] py-3.5 text-[10px] font-medium tracking-[3px] uppercase cursor-pointer font-sans rounded-[2px] transition-all hover:bg-[#e8e0d4] disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}
          >
            {submitting ? 'Saving...' : 'Save my week'}
          </button>
          <span className="block text-[12px] text-[#7a7670] mt-3.5 italic font-serif">
            You can come back and edit any time this week.
          </span>
        </div>

        {/* Previous weeks — always below the current form so the client
            can scroll back and amend or resend older weeks. */}
        {pastWeeks.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-6">
              <div className="inline-block border border-[rgba(255,255,255,0.24)] rounded-[2px] px-4 py-[5px] text-[9px] tracking-[4px] uppercase text-[#a8a49c] mb-3">
                Your previous weeks
              </div>
              <p className="text-[12px] text-[#7a7670] italic font-serif max-w-[380px] mx-auto">
                Tap any week to look back, tidy up something you missed, or resend it to Jess.
              </p>
            </div>
            {pastWeeks.map((w) => (
              <PastWeekCard
                key={w.id}
                week={w}
                email={email}
                onSaved={loadExisting}
                onSend={() => shareWithJess({ pastWeek: w })}
                shareError={shareError}
                sharing={sharing}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Previous week collapsible card ─────────────────────────────────

function PastWeekCard({
  week,
  email,
  onSaved,
  onSend,
  shareError,
  sharing,
}: {
  week: PastWeek
  email: string
  onSaved: () => void
  onSend: () => void
  shareError: string
  sharing: boolean
}) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<DietDay[]>(() => week.payload.days ?? emptyWeekDays(week.week_start))
  const [notes, setNotes] = useState(week.payload.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  function updateDay(idx: number, field: SectionKey, value: string) {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)))
  }

  async function save() {
    setSaving(true); setErr(''); setSaved(false)
    const payload: DietPayload = {
      name: week.payload.name || '',
      email: email.trim(),
      notes: notes.trim() || undefined,
      days,
    }
    const result = await safeSubmit('/api/diet', {
      payload,
      week_start: week.week_start,
      photos: week.photos,
    })
    setSaving(false)
    if (!result.ok) {
      setErr(result.error)
      return
    }
    setSaved(true)
    onSaved()
  }

  const filledCount = days.filter((d) => SECTION_FIELDS.some((s) => (d[s.key] as string | undefined)?.trim())).length
  const dateSummary = new Date(week.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

  return (
    <div className="bg-[#0e0e0e] border border-[rgba(255,255,255,0.24)] rounded-2xl mb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="min-w-0">
          <p className="text-[14px] text-[#f0ece4] font-medium leading-tight">Week of {dateSummary}</p>
          <p className="text-[11px] text-[#7a7670] mt-1">
            {filledCount} day{filledCount === 1 ? '' : 's'} filled
            {week.updated_at !== week.created_at ? ' · edited since first save' : ''}
          </p>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" className={`transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}>
          <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-[rgba(255,255,255,0.14)]">
          {days.map((day, i) => (
            <div key={day.date} className="mt-6">
              <p className="text-[9px] tracking-[4px] uppercase text-[#7a7670] mb-3">{shortDayLabel(day.date)}</p>
              {SECTION_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <Textarea
                    value={(day[f.key] as string | undefined) ?? ''}
                    onChange={(v) => updateDay(i, f.key, v)}
                    placeholder={f.placeholder}
                  />
                </Field>
              ))}
            </div>
          ))}

          <div className="mt-6">
            <Field label="Note for this week">
              <Textarea value={notes} onChange={setNotes} placeholder="Optional" />
            </Field>
          </div>

          {err && <p className="text-[12px] text-[#b06060] mt-3">{err}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-[rgba(255,255,255,0.10)]">
            <p className="text-[11px] text-[#7a7670] italic font-serif">
              {saved ? 'Saved. Jess will see the update on her end.' : 'Any edit is saved to your week and pulls through to Jess.'}
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={save}
                disabled={saving}
                className="bg-transparent border border-[rgba(255,255,255,0.24)] text-[#f0ece4] px-4 py-2 text-[10px] tracking-[2px] uppercase rounded-[2px] disabled:opacity-50"
                style={{ touchAction: 'manipulation' }}
              >
                {saving ? 'Saving...' : 'Save this week'}
              </button>
              <button
                onClick={onSend}
                disabled={sharing}
                className="bg-[#f0ece4] text-[#080808] border-0 px-4 py-2 text-[10px] tracking-[2px] uppercase rounded-[2px] disabled:opacity-50"
                style={{ touchAction: 'manipulation' }}
              >
                {sharing ? 'Preparing...' : 'Resend to Jess'}
              </button>
            </div>
          </div>

          {shareError && <p className="text-[11px] text-[#b06060] mt-2">{shareError}</p>}
        </div>
      )}
    </div>
  )
}

// ── Shared primitives (dark theme, matches the check-in form) ──────

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#0e0e0e] border border-[rgba(255,255,255,0.24)] rounded-2xl p-7 mb-3">{children}</div>
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] tracking-[4px] uppercase text-[#7a7670] font-normal mb-5 pb-3.5 border-b border-[rgba(255,255,255,0.24)] block">
      {children}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <label className="block text-[10px] tracking-[2px] uppercase text-[#a8a49c] mb-[9px]">{label}</label>
      {children}
    </div>
  )
}

function G2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7">{children}</div>
}

function Input({ value, onChange, placeholder, type = 'text', autoComplete, inputMode }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoComplete?: string; inputMode?: 'email' | 'tel' | 'text' | 'numeric' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.24)] py-2.5 text-sm text-[#f0ece4] font-light outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors placeholder:text-[#7a7670]"
    />
  )
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.24)] py-2.5 text-sm text-[#f0ece4] font-light outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors placeholder:text-[#7a7670] resize-y min-h-[64px] leading-[1.7]"
      rows={2}
    />
  )
}
