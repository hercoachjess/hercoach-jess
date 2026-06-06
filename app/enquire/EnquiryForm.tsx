'use client'

import { useState } from 'react'
import { safeSubmit } from '@/lib/safe-submit'

const GOAL_OPTIONS = [
  'Fat Loss',
  'Build Muscle',
  'Body Recomposition',
  'Maintain & Tone',
  'General Health',
  'Not sure yet',
]

const HEAR_OPTIONS = [
  'Instagram',
  'TikTok',
  'A friend',
  'Google',
  'Already a client',
  'Somewhere else',
]

const CONTACT_OPTIONS = [
  'WhatsApp',
  'Email',
  'Phone call',
]

export default function EnquiryForm() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [goal, setGoal] = useState('')
  const [about, setAbout] = useState('')
  const [hearFrom, setHearFrom] = useState('')
  const [bestContact, setBestContact] = useState('')

  async function submitForm() {
    if (!firstName.trim() || !email.trim()) {
      setError('Please share your first name and email so Jess can reach you.')
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const result = await safeSubmit('/api/enquiry', {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        goal: goal || null,
        about: about.trim() || null,
        hear_from: hearFrom || null,
        best_contact: bestContact || null,
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
      <div className="min-h-screen relative" style={{ backgroundColor: '#F6F1E9' }}>
        <div className="relative z-10 max-w-[640px] mx-auto px-7 pb-24">
          <div className="text-center py-20 fade-in">
            <span className="font-serif italic text-[60px] font-light block mb-6 opacity-30" style={{ color: '#4A4038' }}>✦</span>

            <h2 className="font-serif text-[34px] font-light mb-4 leading-[1.2]" style={{ color: '#4A4038' }}>
              Thank you — Jess will be<br />in touch soon.
            </h2>

            <p className="text-sm leading-[1.8] font-light max-w-[420px] mx-auto mb-2.5" style={{ color: '#6a5e54' }}>
              I&apos;ve got your details and I read every enquiry personally. Thank you for taking the time to reach out, {firstName}.
            </p>

            <p className="text-xs mt-2 italic font-serif" style={{ color: '#8a7c70' }}>
              Reaching out is the hardest step. You&apos;ve done it.
            </p>

            {/* Free guide block */}
            <div className="mt-12 pt-10 border-t" style={{ borderColor: 'rgba(74,64,56,0.18)' }}>
              <p className="text-[13px] leading-[1.7] font-light mb-5" style={{ color: '#4A4038' }}>
                As a thank-you, here&apos;s your free guide <span aria-hidden>👇</span>
              </p>

              <a
                href="https://drive.google.com/uc?export=download&id=1fBBdJ6TKelta7j6ShGJ_jqczX9zQWG9J"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-[42px] py-4 text-[11px] font-medium tracking-[2.5px] uppercase rounded-[2px] transition-all hover:opacity-90 hover:shadow-md"
                style={{
                  backgroundColor: '#C49A5E',
                  color: '#F6F1E9',
                  fontFamily: 'var(--font-jost), sans-serif',
                  letterSpacing: '0.18em',
                  boxShadow: '0 2px 10px rgba(196,154,94,0.25)',
                  touchAction: 'manipulation',
                }}
              >
                Download: Cut the Food Noise
              </a>

              <p className="text-[11px] mt-4 italic font-serif" style={{ color: '#8a7c70' }}>
                Opens in a new tab — save it for whenever you need it.
              </p>
            </div>

            <span className="font-serif italic text-[17px] block mt-12" style={{ color: '#8a7c70' }}>
              Less restriction. More you.
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#080808] min-h-screen relative" style={{ fontFamily: 'var(--font-jost), sans-serif', color: '#e0d8cc' }}>
      <Noise />

      <div className="relative z-10 max-w-[640px] mx-auto px-7 pb-24">
        {/* Hero */}
        <div className="pt-20 pb-[60px] text-center border-b border-[rgba(255,255,255,0.24)] mb-[52px]">
          <span className="text-[9px] tracking-[7px] uppercase text-[#7a7670] font-light block mb-2">Coaching enquiries</span>
          <span className="font-serif italic text-[44px] font-light text-[#f0ece4] tracking-[-1px] block leading-none">hercoach Jess</span>
          <div className="w-full h-px my-[10px] mb-[9px]" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />
          <span className="text-[9px] tracking-[5px] uppercase text-[#7a7670] font-light block mb-8">Less restriction. More you.</span>

          <h1 className="font-serif font-light text-[clamp(28px,5vw,40px)] text-[#f0ece4] tracking-[-0.5px] mb-4 leading-[1.2]">
            Thinking about<br /><em className="italic">working together?</em>
          </h1>
          <p className="text-[13px] text-[#a8a49c] leading-[1.9] font-light max-w-[440px] mx-auto">
            Tell me a little about you and where you&apos;d like to get to. No obligation, no scripts — I read every enquiry personally and reply as soon as I can.
          </p>

          <div className="grid grid-cols-3 gap-px border border-[rgba(255,255,255,0.24)] rounded mt-7 overflow-hidden bg-[rgba(255,255,255,0.24)]">
            <Cred label="Qualification" value="Registered Dietitian" />
            <Cred label="Registered with" value="HCPC & BDA" />
            <Cred label="1:1 coaching" value="Personalised plans" />
          </div>
        </div>

        {error && (
          <div className="text-center mb-5 px-4 py-3 bg-[rgba(176,96,96,0.08)] border border-[rgba(176,96,96,0.2)] rounded">
            <p className="text-xs text-[#b06060] font-light">{error}</p>
          </div>
        )}

        <Card>
          <CardLabel>Your details</CardLabel>
          <G2>
            <Field label="First name"><Input value={firstName} onChange={setFirstName} placeholder="e.g. Sarah" autoComplete="given-name" /></Field>
            <Field label="Last name (optional)"><Input value={lastName} onChange={setLastName} placeholder="e.g. Carter" autoComplete="family-name" /></Field>
            <Field label="Email"><Input type="email" inputMode="email" value={email} onChange={setEmail} placeholder="you@email.com" autoComplete="email" /></Field>
            <Field label="Phone / WhatsApp (optional)"><Input type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="07700 900000" autoComplete="tel" /></Field>
          </G2>
        </Card>

        <Card>
          <CardLabel>What brought you here?</CardLabel>
          <Field label="What are you working towards?">
            <Pills>
              {GOAL_OPTIONS.map((v) => (
                <Pill key={v} active={goal === v} onClick={() => setGoal(v)}>{v}</Pill>
              ))}
            </Pills>
          </Field>
          <Field label="Where are you now & where would you love to be?">
            <Textarea value={about} onChange={setAbout} placeholder="A few sentences — health, training, food, lifestyle. The more honest, the better the fit." />
          </Field>
          <Field label="How did you find me?">
            <Pills>
              {HEAR_OPTIONS.map((v) => (
                <Pill key={v} active={hearFrom === v} onClick={() => setHearFrom(v)}>{v}</Pill>
              ))}
            </Pills>
          </Field>
          <Field label="Best way to reach you?">
            <Pills>
              {CONTACT_OPTIONS.map((v) => (
                <Pill key={v} active={bestContact === v} onClick={() => setBestContact(v)}>{v}</Pill>
              ))}
            </Pills>
          </Field>
        </Card>

        <div className="text-center mt-10">
          <button
            onClick={submitForm}
            disabled={submitting}
            className="bg-[#f0ece4] border-0 text-[#080808] px-[52px] py-3.5 text-[10px] font-medium tracking-[3px] uppercase cursor-pointer font-sans rounded-[2px] transition-all hover:bg-[#e8e0d4] disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send enquiry'}
          </button>
          <span className="block text-[12px] text-[#7a7670] mt-3.5 italic font-serif">
            Read and replied to personally — as soon as I can.
          </span>
        </div>

        <Footer />
      </div>
    </div>
  )
}

function Noise() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      }}
    />
  )
}

function Cred({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0e0e0e] py-3.5 px-2.5 text-center">
      <span className="text-[8px] tracking-[2.5px] uppercase text-[#7a7670] block mb-1">{label}</span>
      <span className="font-serif italic text-[13px] text-[#e0d8cc] font-light">{value}</span>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#0e0e0e] border border-[rgba(255,255,255,0.24)] rounded-2xl p-7 mb-3">
      {children}
    </div>
  )
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] tracking-[3px] uppercase text-[#7a7670] block mb-[18px] pb-3.5 border-b border-[rgba(255,255,255,0.24)]">
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
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-0">{children}</div>
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

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.24)] py-2.5 text-base text-[#f0ece4] font-light outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors placeholder:text-[#7a7670] resize-y min-h-[100px] leading-[1.7]"
    />
  )
}

function Pills({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-[7px]">{children}</div>
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-block px-[18px] py-2.5 border rounded-[2px] text-xs font-normal font-sans cursor-pointer transition-all min-h-[40px] ${
        active
          ? 'border-[rgba(255,255,255,0.3)] text-[#f0ece4] bg-[rgba(255,255,255,0.03)]'
          : 'border-[rgba(255,255,255,0.24)] text-[#a8a49c] hover:border-[rgba(255,255,255,0.26)] hover:text-[#e0d8cc]'
      }`}
    >
      {children}
    </button>
  )
}

function Footer() {
  return (
    <div className="text-center pt-10 text-[9px] tracking-[4px] uppercase text-[#7a7670] border-t border-[rgba(255,255,255,0.24)] mt-[60px] font-light">
      hercoach jess &nbsp;·&nbsp; registered dietitian &nbsp;·&nbsp; hcpc registered &nbsp;·&nbsp; england &amp; wales
    </div>
  )
}
