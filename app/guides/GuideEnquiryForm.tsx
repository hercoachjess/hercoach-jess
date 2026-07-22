'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { safeSubmit } from '@/lib/safe-submit'
import { GUIDES } from '@/lib/guides'

export default function GuideEnquiryForm() {
  const searchParams = useSearchParams()
  const preselected = searchParams.get('guide') || ''
  const initialGuide = GUIDES.some((g) => g.name === preselected) ? preselected : GUIDES[0]?.name ?? ''

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [guide, setGuide] = useState(initialGuide)
  const [message, setMessage] = useState('')

  const selectedGuide = GUIDES.find((g) => g.name === guide)

  async function submitForm() {
    if (!name.trim() || !email.trim()) {
      setError('Please share your name and email so Jess can send it over.')
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const result = await safeSubmit('/api/pdf-enquiry', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        guide,
        message: message.trim() || null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSubmitted(true)
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F6F1E9' }}>
        <div className="max-w-[560px] mx-auto px-7 pb-24">
          <div className="text-center py-20 fade-in">
            <span className="font-serif italic text-[54px] font-light block mb-6 opacity-30" style={{ color: '#4A4038' }}>✦</span>
            <h2 className="font-serif text-[32px] font-light mb-4 leading-[1.2]" style={{ color: '#4A4038' }}>
              Got it — thank you, {name.split(' ')[0]}.
            </h2>
            <p className="text-sm leading-[1.8] font-light max-w-[420px] mx-auto" style={{ color: '#6a5e54' }}>
              I&apos;ve got your request for the <em className="italic">{guide}</em>. I&apos;ll be in touch shortly with how to grab it. Speak soon.
            </p>
            <span className="font-serif italic text-[16px] block mt-10" style={{ color: '#8a7c70' }}>
              Less restriction. More you.
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#080808] min-h-screen relative" style={{ fontFamily: 'var(--font-jost), sans-serif', color: '#e0d8cc' }}>
      <div className="relative z-10 max-w-[560px] mx-auto px-7 pb-24">
        <div className="pt-20 pb-[50px] text-center border-b border-[rgba(255,255,255,0.24)] mb-[44px]">
          <span className="text-[9px] tracking-[7px] uppercase text-[#7a7670] font-light block mb-2">Guides &amp; extras</span>
          <span className="font-serif italic text-[40px] font-light text-[#f0ece4] tracking-[-1px] block leading-none">hercoach Jess</span>
          <div className="w-full h-px my-[10px] mb-[9px]" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />
          <span className="text-[9px] tracking-[5px] uppercase text-[#7a7670] font-light block mb-8">Less restriction. More you.</span>
          <h1 className="font-serif font-light text-[clamp(26px,5vw,36px)] text-[#f0ece4] tracking-[-0.5px] mb-4 leading-[1.2]">
            Grab a <em className="italic">guide.</em>
          </h1>
          <p className="text-[13px] text-[#a8a49c] leading-[1.9] font-light max-w-[400px] mx-auto">
            Tell me which one you&apos;d like and where to reach you, and I&apos;ll send over how to get it.
          </p>
        </div>

        {error && (
          <div className="text-center mb-5 px-4 py-3 bg-[rgba(176,96,96,0.08)] border border-[rgba(176,96,96,0.2)] rounded">
            <p className="text-xs text-[#b06060] font-light">{error}</p>
          </div>
        )}

        <div className="bg-[#0e0e0e] border border-[rgba(255,255,255,0.24)] rounded-2xl p-7">
          <Field label="Which guide?">
            <select
              value={guide}
              onChange={(e) => setGuide(e.target.value)}
              className="input-underline text-base"
            >
              {GUIDES.map((g) => (
                <option key={g.name} value={g.name} className="bg-[#0e0e0e]">
                  {g.name} — {g.price}
                </option>
              ))}
            </select>
            {selectedGuide && (
              <p className="text-[12px] text-[#8a8680] italic mt-2 leading-relaxed">{selectedGuide.blurb}</p>
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-0">
            <Field label="Your name"><Input value={name} onChange={setName} placeholder="e.g. Sarah" autoComplete="name" /></Field>
            <Field label="Email"><Input type="email" inputMode="email" value={email} onChange={setEmail} placeholder="you@email.com" autoComplete="email" /></Field>
          </div>
          <Field label="Phone / WhatsApp (optional)">
            <Input type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="07700 900000" autoComplete="tel" />
          </Field>
          <Field label="Anything to add? (optional)">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any questions, or another guide you'd like..."
              className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.24)] py-2.5 text-base text-[#f0ece4] font-light outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors placeholder:text-[#7a7670] resize-y min-h-[80px] leading-[1.7]"
            />
          </Field>
        </div>

        <div className="text-center mt-10">
          <button
            onClick={submitForm}
            disabled={submitting}
            className="bg-[#f0ece4] border-0 text-[#080808] px-[52px] py-3.5 text-[10px] font-medium tracking-[3px] uppercase cursor-pointer font-sans rounded-[2px] transition-all hover:bg-[#e8e0d4] disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send request'}
          </button>
          <span className="block text-[12px] text-[#7a7670] mt-3.5 italic font-serif">
            Read and replied to personally, as soon as I can.
          </span>
        </div>

        <div className="text-center pt-10 text-[9px] tracking-[4px] uppercase text-[#7a7670] border-t border-[rgba(255,255,255,0.24)] mt-[50px] font-light">
          hercoach jess &nbsp;·&nbsp; registered dietitian &nbsp;·&nbsp; hcpc registered
        </div>
      </div>
    </div>
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

function Input({
  value, onChange, placeholder, type = 'text', inputMode, autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal' | 'search' | 'url'
  autoComplete?: string
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.24)] py-2.5 text-base text-[#f0ece4] font-light outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors placeholder:text-[#7a7670]"
    />
  )
}
