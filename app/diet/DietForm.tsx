'use client'

import { useEffect, useMemo, useState } from 'react'
import { safeSubmit } from '@/lib/safe-submit'
import { currentWeekStart, emptyWeekDays, shortDayLabel, weekLabel } from '@/lib/diet-week'
import type { DietDay, DietPayload } from '@/types'

/**
 * Public weekly food tracker form.
 *
 * Warm cream palette to match the enquiry thank-you screen, on the
 * theory that anything client-facing should feel less "app" and more
 * "a note from Jess". Clients open the same link any time in the
 * week: the API upserts by (client + week_start), so their entries
 * come back pre-filled if they revisit.
 */
const SECTION_FIELDS = [
  { key: 'breakfast', label: 'Breakfast', placeholder: 'e.g. 80g oats with milk and berries' },
  { key: 'lunch',     label: 'Lunch',     placeholder: 'e.g. chicken salad, olive oil, seeds' },
  { key: 'dinner',    label: 'Dinner',    placeholder: 'e.g. salmon, potatoes, greens' },
  { key: 'snacks',    label: 'Small meals / snacks', placeholder: 'e.g. apple, handful of almonds, protein bar' },
  { key: 'drinks',    label: 'Fluid / drinks', placeholder: 'e.g. 2L water, one coffee, glass of wine Sat' },
] as const

type SectionKey = typeof SECTION_FIELDS[number]['key']

export default function DietForm({ initialEmail }: { initialEmail: string }) {
  const weekStart = useMemo(() => currentWeekStart(), [])
  const [name, setName] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [notes, setNotes] = useState('')
  const [days, setDays] = useState<DietDay[]>(() => emptyWeekDays(weekStart))
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoUrls, setPhotoUrls] = useState<string[]>([]) // already-uploaded paths from a prior save
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // If we have an email prefill (they've been sent the personalised
  // link), fetch any existing entries for this week so the form comes
  // back pre-populated rather than blank. Best-effort, silent on error.
  useEffect(() => {
    async function loadExisting() {
      if (!email.trim()) return
      setLoadingExisting(true)
      try {
        const res = await fetch(`/api/diet?email=${encodeURIComponent(email.trim())}&week_start=${weekStart}`)
        if (!res.ok) return
        const data = await res.json() as { payload?: DietPayload; photos?: string[] } | null
        if (data?.payload) {
          if (data.payload.name) setName(data.payload.name)
          if (data.payload.notes) setNotes(data.payload.notes)
          if (Array.isArray(data.payload.days) && data.payload.days.length > 0) {
            // Overlay any saved day data on the 7 empty templates.
            const byDate = new Map(data.payload.days.map((d) => [d.date, d] as const))
            setDays((prev) => prev.map((d) => byDate.get(d.date) ?? d))
          }
        }
        if (Array.isArray(data?.photos)) setPhotoUrls(data.photos)
      } finally {
        setLoadingExisting(false)
      }
    }
    loadExisting()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

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
          .from('checkin-photos') // reuse the existing private bucket
          .upload(path, file, { contentType: file.type, upsert: false })
        if (uploadErr) { setPhotoError(uploadErr.message); continue }
        uploaded.push(path)
      }
      setPhotoFiles((prev) => [...prev, ...Array.from(files)])
      setPhotoUrls((prev) => [...prev, ...uploaded])
    } catch (e: unknown) {
      setPhotoError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setPhotoUploading(false)
    }
  }

  function removePhoto(idx: number) {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx))
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
      photos: photoUrls,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSubmitted(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (submitted) {
    return (
      <div className="min-h-screen relative" style={{ backgroundColor: '#F6F1E9' }}>
        <div className="relative z-10 max-w-[640px] mx-auto px-7 pb-24">
          <div className="text-center py-20 fade-in">
            <span className="font-serif italic text-[60px] font-light block mb-6 opacity-30" style={{ color: '#4A4038' }}>✦</span>
            <h2 className="font-serif text-[34px] font-light mb-4 leading-[1.2]" style={{ color: '#4A4038' }}>
              Saved. Thank you.
            </h2>
            <p className="text-sm leading-[1.8] font-light max-w-[440px] mx-auto mb-4" style={{ color: '#6a5e54' }}>
              Come back to the same link any time this week to add more or edit. It stays open until next Monday.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="text-[11px] font-medium tracking-[2px] uppercase underline"
              style={{ color: '#4A4038', fontFamily: 'var(--font-jost), sans-serif', touchAction: 'manipulation' }}
            >
              Keep adding
            </button>
            <span className="font-serif italic text-[17px] block mt-12" style={{ color: '#8a7c70' }}>
              Less restriction. More you.
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#F6F1E9' }}>
      <div className="relative z-10 max-w-[640px] mx-auto px-7 pb-24">
        {/* Hero */}
        <div className="pt-16 pb-8 text-center">
          <span className="text-[9px] tracking-[5px] uppercase font-light block mb-2" style={{ color: '#8a7c70' }}>Your food week</span>
          <h1 className="font-serif italic text-[44px] font-light block mb-2" style={{ color: '#4A4038' }}>
            {weekLabel(weekStart)}
          </h1>
          <p className="text-[13px] leading-[1.7] font-light max-w-[440px] mx-auto" style={{ color: '#6a5e54' }}>
            Fill in what you actually had, not what you wish you had. No judgement. It doesn&apos;t have to be perfect. Even patchy days help me support you well.
          </p>
        </div>

        {loadingExisting && (
          <p className="text-center text-xs italic mb-4" style={{ color: '#8a7c70' }}>
            Loading anything you&apos;ve already saved this week...
          </p>
        )}

        {/* Your details */}
        <Section title="Your details" cream>
          <Field label="First name">
            <Input value={name} onChange={setName} placeholder="e.g. Sarah" autoComplete="given-name" />
          </Field>
          <Field label="Email (the one Jess has for you)">
            <Input type="email" inputMode="email" value={email} onChange={setEmail} placeholder="you@email.com" autoComplete="email" />
          </Field>
        </Section>

        {/* Daily entries — 7 stacked day cards */}
        {days.map((day, i) => (
          <Section key={day.date} title={shortDayLabel(day.date)} cream>
            {SECTION_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <Textarea
                  value={(day[f.key] as string | undefined) ?? ''}
                  onChange={(v) => updateDay(i, f.key, v)}
                  placeholder={f.placeholder}
                />
              </Field>
            ))}
          </Section>
        ))}

        {/* Optional weekly note */}
        <Section title="Anything else Jess should know" cream>
          <Textarea
            value={notes}
            onChange={setNotes}
            placeholder="e.g. felt hungry mid-afternoons, work was manic Thurs, skipped dinner Fri"
          />
        </Section>

        {/* Photos */}
        <Section title="Photos (optional)" cream>
          <p className="text-[12px] leading-[1.6] mb-3" style={{ color: '#6a5e54' }}>
            Photos of what you had are a great shortcut. Snap the plate, the packet, the coffee, whatever. Sometimes it&apos;s quicker than typing and Jess can see portion sizes at a glance.
          </p>
          <label
            className="block text-center py-4 border-2 border-dashed rounded-sm cursor-pointer transition-colors"
            style={{ borderColor: '#C49A5E', color: '#4A4038', touchAction: 'manipulation' }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoUpload(e.target.files)}
              disabled={photoUploading}
            />
            <span className="text-[13px] font-light" style={{ fontFamily: 'var(--font-jost), sans-serif' }}>
              {photoUploading ? 'Uploading...' : photoUrls.length > 0 ? 'Add more photos' : 'Add photos'}
            </span>
          </label>
          {photoError && <p className="text-[12px] mt-2" style={{ color: '#b06060' }}>{photoError}</p>}
          {photoUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photoUrls.map((path, i) => (
                <div key={i} className="relative">
                  <div
                    className="aspect-square rounded-sm flex items-center justify-center text-[11px] italic"
                    style={{ background: 'rgba(74,64,56,0.08)', color: '#6a5e54' }}
                  >
                    {photoFiles[i]?.name?.split('.')[0]?.slice(0, 16) || `Photo ${i + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full text-[11px]"
                    style={{ background: 'rgba(255,255,255,0.9)', color: '#4A4038' }}
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {error && (
          <div className="text-center mb-5 px-4 py-3 rounded" style={{ background: 'rgba(176,96,96,0.08)', border: '1px solid rgba(176,96,96,0.2)' }}>
            <p className="text-xs" style={{ color: '#b06060' }}>{error}</p>
          </div>
        )}

        <div className="text-center mt-8">
          <button
            onClick={submit}
            disabled={submitting}
            className="border-0 px-[52px] py-3.5 text-[10px] font-medium tracking-[3px] uppercase cursor-pointer rounded-[2px] transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: '#C49A5E',
              color: '#F6F1E9',
              fontFamily: 'var(--font-jost), sans-serif',
              letterSpacing: '0.18em',
              touchAction: 'manipulation',
            }}
          >
            {submitting ? 'Saving...' : 'Save my week'}
          </button>
          <p className="block text-[11px] mt-3.5 italic font-serif" style={{ color: '#8a7c70' }}>
            You can come back and edit any time this week.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Local presentational primitives (cream theme) ───────────────────

function Section({ title, cream, children }: { title: string; cream?: boolean; children: React.ReactNode }) {
  return (
    <div
      className="mb-4 p-5 rounded-sm"
      style={{
        background: cream ? 'rgba(255,255,255,0.6)' : 'rgba(74,64,56,0.04)',
        border: '1px solid rgba(74,64,56,0.12)',
      }}
    >
      <p className="text-[10px] tracking-[3px] uppercase mb-3" style={{ color: '#8a7c70' }}>{title}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] mb-1" style={{ color: '#6a5e54' }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void; type?: string; inputMode?: 'email' | 'tel' | 'text' | 'numeric'; placeholder?: string; autoComplete?: string }) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[16px] py-2 border-b bg-transparent"
      style={{ color: '#4A4038', borderColor: 'rgba(74,64,56,0.24)', outline: 'none', fontFamily: 'var(--font-jost), sans-serif' }}
    />
  )
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full text-[16px] py-2 border-b bg-transparent leading-relaxed"
      style={{ color: '#4A4038', borderColor: 'rgba(74,64,56,0.24)', outline: 'none', fontFamily: 'var(--font-jost), sans-serif', resize: 'vertical' }}
    />
  )
}
