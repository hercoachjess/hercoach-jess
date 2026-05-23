'use client'

import { useState } from 'react'

// ───────────── MOOD / ADHERENCE ICONS ─────────────
type IconProps = { active: boolean }
const stroke = (a: boolean) => (a ? '#f0ece4' : '#444')

// Body feel
function FeelAmazing({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 21c-4.4 0-8-3.1-8-7 0-2.5 1.5-4.7 3-6 0 2 1 3.5 2 4.5C9.5 10 10 7 10 5c0-1 .5-2 1-3 1 2 3 3.5 3.5 5.5C15.5 6 16 4 16 3c1 1.5 2 3.5 2 5.5 0 1-.5 2-1 2.5.5-.5 1-1.5 1-2.5.5 1.5.5 3.5-.5 5C16.5 15.5 14.5 17 13 18c.5-.5 1-1.5 1-2.5-1 1.5-2 2.5-2 5.5z" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function FeelGood({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 16l5-5 4 4 7-8" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function FeelOkay({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 12h16M4 17h16" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function FeelNotGreat({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 8l5 5 4-4 7 8" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function FeelRough({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 18a4 4 0 01-.7-7.9A5 5 0 0116 10a4 4 0 01-.3 8H6z" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 22v-1M12 22v-2M16 22v-1" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// Adherence
function AdhBullseye({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={stroke(active)} strokeWidth="1.2" />
      <circle cx="12" cy="12" r="5" stroke={stroke(active)} strokeWidth="1.2" />
      <circle cx="12" cy="12" r="1.5" stroke={stroke(active)} strokeWidth="1.2" />
    </svg>
  )
}
function AdhTick({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l5 5L20 7" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function AdhHalf({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5a7 7 0 010 14" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 5a7 7 0 000 14" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 3" />
    </svg>
  )
}
function AdhWavy({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 12c2-4 4 4 6 0s4-4 6 0 4 4 6 0" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function AdhX({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// Mood
function MoodStar({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" stroke={stroke(active)} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
function MoodSun({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke={stroke(active)} strokeWidth="1.2" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function MoodMinus({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke={stroke(active)} strokeWidth="1.2" />
      <path d="M9 12h6" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function MoodDrop({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5c0 0-6 6-6 10a6 6 0 0012 0c0-4-6-10-6-10z" stroke={stroke(active)} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
function MoodWave({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 10c2-4 4 4 6 0s4-4 6 0 4 4 6 0" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 16c2-4 4 4 6 0s4-4 6 0 4 4 6 0" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

const FEEL = [
  { val: 'Amazing', Icon: FeelAmazing },
  { val: 'Good', Icon: FeelGood },
  { val: 'Okay', Icon: FeelOkay },
  { val: 'Not great', Icon: FeelNotGreat },
  { val: 'Rough week', Icon: FeelRough },
]
const ADH = [
  { val: 'Nailed it', Icon: AdhBullseye },
  { val: 'Mostly on track', Icon: AdhTick },
  { val: 'About 50/50', Icon: AdhHalf },
  { val: 'Struggled', Icon: AdhWavy },
  { val: 'Off the rails', Icon: AdhX },
]
const MOOD = [
  { val: 'Amazing', Icon: MoodStar },
  { val: 'Positive', Icon: MoodSun },
  { val: 'Neutral', Icon: MoodMinus },
  { val: 'Low', Icon: MoodDrop },
  { val: 'Struggling', Icon: MoodWave },
]

// ───────────── COMPONENT ─────────────
export default function CheckinForm() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Identity
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // Progress & Weight
  const [weightKg, setWeightKg] = useState('')
  const [clothesFit, setClothesFit] = useState('')
  const [bodyFeel, setBodyFeel] = useState('')

  // Nutrition
  const [adherence, setAdherence] = useState('')
  const [threwOff, setThrewOff] = useState('')
  const [hunger, setHunger] = useState('')
  const [cravings, setCravings] = useState('')

  // Training
  const [sessions, setSessions] = useState('')
  const [trainingFeel, setTrainingFeel] = useState('')
  const [prs, setPrs] = useState('')
  const [discomfort, setDiscomfort] = useState('')

  // Recovery
  const [sleep, setSleep] = useState('')
  const [stressLvl, setStressLvl] = useState('')
  const [energy, setEnergy] = useState('')
  const [water, setWater] = useState('')

  // Wins
  const [biggestWin, setBiggestWin] = useState('')
  const [hardestPart, setHardestPart] = useState('')
  const [mood, setMood] = useState('')
  const [questions, setQuestions] = useState('')

  async function submitForm() {
    if (!name.trim() || !email.trim()) {
      setError('Please enter your name and email so Jess can find your file.')
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setError('')
    setSubmitting(true)

    const payload = {
      name: name.trim(),
      email: email.trim(),
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      clothes_fit: clothesFit,
      body_feel: bodyFeel,
      nutrition_adherence: adherence,
      threw_off: threwOff,
      hunger,
      cravings,
      training_sessions: sessions,
      training_feel: trainingFeel,
      prs,
      discomfort,
      sleep_quality: sleep,
      stress_level: stressLvl,
      energy,
      water_intake: water,
      biggest_win: biggestWin,
      hardest_part: hardestPart,
      mood,
      questions_for_jess: questions,
    }

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed.')
      setSubmitted(true)
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#080808] min-h-screen relative" style={{ fontFamily: 'var(--font-jost), sans-serif', color: '#d8d0c8' }}>
      <NoiseOverlay />
      <div className="relative z-10 max-w-[640px] mx-auto px-7 pb-24">

        {!submitted ? (
          <>
            {/* HERO */}
            <div className="pt-[72px] pb-[52px] text-center border-b border-[rgba(255,255,255,0.07)] mb-11">
              <span className="font-serif italic text-[38px] font-light text-[#f0ece4] tracking-[-1px] block leading-none">hercoach Jess</span>
              <div className="w-full h-px my-[9px] mb-2" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />
              <span className="text-[9px] tracking-[5px] uppercase text-[#4a4a4a] font-light block mb-[30px]">Less restriction. More you.</span>
              <div className="inline-block border border-[rgba(255,255,255,0.07)] rounded-[2px] px-4 py-[5px] text-[9px] tracking-[4px] uppercase text-[#666] mb-[22px]">
                Weekly Check-In
              </div>
              <h1 className="font-serif font-light text-[clamp(26px,5vw,38px)] text-[#f0ece4] tracking-[-0.5px] mb-3.5 leading-[1.2]">
                How&apos;s your week been,<br /><em className="italic">lovely?</em>
              </h1>
              <p className="text-[13px] text-[#666] leading-[1.85] font-light max-w-[380px] mx-auto">
                Honest answers only. Jess reads every single word. No judgement — just progress.
              </p>
            </div>

            {/* IDENTITY */}
            <Card>
              <CardLabel>Your details</CardLabel>
              <G2>
                <Field label="Full name"><Input value={name} onChange={setName} placeholder="As registered with Jess" /></Field>
                <Field label="Email address"><Input type="email" value={email} onChange={setEmail} placeholder="Same email you use with Jess" /></Field>
              </G2>
            </Card>

            {/* PROGRESS & WEIGHT */}
            <Card>
              <CardLabel>Progress &amp; Weight</CardLabel>
              <G2>
                <Field label="Current Weight (kg)"><Input type="number" value={weightKg} onChange={setWeightKg} placeholder="e.g. 71.2" /></Field>
                <Field label="How are clothes fitting?">
                  <Select value={clothesFit} onChange={setClothesFit} options={['Noticeably looser','Slightly looser','Same','Tighter']} />
                </Field>
              </G2>
              <Field label="How do you feel in your body this week?">
                <IconRow cols={5}>
                  {FEEL.map(({ val, Icon }) => (
                    <IconPill key={val} active={bodyFeel === val} onClick={() => setBodyFeel(val)} label={val} icon={<Icon active={bodyFeel === val} />} />
                  ))}
                </IconRow>
              </Field>
            </Card>

            {/* NUTRITION */}
            <Card>
              <CardLabel>Nutrition</CardLabel>
              <Field label="How well did you stick to your nutrition?">
                <IconRow cols={5}>
                  {ADH.map(({ val, Icon }) => (
                    <IconPill key={val} active={adherence === val} onClick={() => setAdherence(val)} label={val} icon={<Icon active={adherence === val} />} />
                  ))}
                </IconRow>
              </Field>
              <Field label="What threw you off (if anything)?">
                <Textarea value={threwOff} onChange={setThrewOff} placeholder="Work stress? Social events? Just didn't fancy the meals? All fine — tell me." />
              </Field>
              <Field label="Hunger levels">
                <Pills>{['Never hungry','Slightly hungry','Manageable','Very hungry','Starving'].map(v => <Pill key={v} active={hunger === v} onClick={() => setHunger(v)}>{v}</Pill>)}</Pills>
              </Field>
              <Field label="Cravings you struggled with?">
                <Input value={cravings} onChange={setCravings} placeholder="e.g. chocolate in the evenings, takeaway on Friday..." />
              </Field>
            </Card>

            {/* TRAINING */}
            <Card>
              <CardLabel>Training</CardLabel>
              <G2>
                <Field label="Sessions completed">
                  <Select value={sessions} onChange={setSessions} options={['None — missed all','1 session','2 sessions','3 sessions','4 sessions','Did extra']} />
                </Field>
                <Field label="How did training feel?">
                  <Select value={trainingFeel} onChange={setTrainingFeel} options={['Felt strong — smashed it','Good — solid sessions','Average — went through it','Tough — really struggled','Exhausted']} />
                </Field>
              </G2>
              <Field label="New personal bests or improvements?">
                <Input value={prs} onChange={setPrs} placeholder="e.g. added 2.5kg to squat, 10 full push-ups for the first time..." />
              </Field>
              <Field label="Anything that felt uncomfortable or painful?">
                <Input value={discomfort} onChange={setDiscomfort} placeholder="e.g. knee aching on squats, shoulder felt tight..." />
              </Field>
            </Card>

            {/* RECOVERY */}
            <Card>
              <CardLabel>Recovery &amp; Wellbeing</CardLabel>
              <G2>
                <Field label="Sleep quality">
                  <Select value={sleep} onChange={setSleep} options={['Excellent — 7–9hrs','Good — mostly solid','Average — broken','Poor — under 6hrs','Terrible']} />
                </Field>
                <Field label="Stress levels">
                  <Select value={stressLvl} onChange={setStressLvl} options={['Low — calm','Moderate','High','Very high']} />
                </Field>
                <Field label="Energy day-to-day">
                  <Select value={energy} onChange={setEnergy} options={['High — feeling great','Good','Moderate — up and down','Low','Very low — exhausted']} />
                </Field>
                <Field label="Water intake">
                  <Select value={water} onChange={setWater} options={['2L+ consistently','About 1.5–2L','About 1–1.5L','Under 1L']} />
                </Field>
              </G2>
            </Card>

            {/* WINS */}
            <Card>
              <CardLabel>Wins &amp; Struggles</CardLabel>
              <div className="bg-[#141414] rounded-md px-4 py-3.5 mb-5">
                <p className="text-xs text-[#4a4a4a] leading-[1.7] font-light italic font-serif">
                  A win is anything — choosing water over Coke, getting all your steps in, not finishing the biscuits at work. Big or small, it all counts.
                </p>
              </div>
              <Field label="Your biggest win this week">
                <Textarea value={biggestWin} onChange={setBiggestWin} placeholder="Write it down. You deserve to celebrate it." />
              </Field>
              <Field label="What's been the hardest part?">
                <Textarea value={hardestPart} onChange={setHardestPart} placeholder="e.g. evening snacking, motivation to train, social eating..." />
              </Field>
              <Field label="Your mood this week">
                <IconRow cols={5}>
                  {MOOD.map(({ val, Icon }) => (
                    <IconPill key={val} active={mood === val} onClick={() => setMood(val)} label={val} icon={<Icon active={mood === val} />} />
                  ))}
                </IconRow>
              </Field>
              <Field label="Questions or notes for Jess?">
                <Textarea value={questions} onChange={setQuestions} placeholder="Anything at all — this is your space." />
              </Field>
            </Card>

            {error && (
              <div className="text-center mt-4 px-4 py-3 bg-[rgba(176,96,96,0.08)] border border-[rgba(176,96,96,0.2)] rounded">
                <p className="text-xs text-[#b06060] font-light">{error}</p>
              </div>
            )}

            <div className="text-center mt-10">
              <button
                onClick={submitForm} disabled={submitting}
                className="bg-[#f0ece4] border-0 text-[#080808] px-[52px] py-3.5 text-[10px] font-medium tracking-[3px] uppercase cursor-pointer font-sans rounded-[2px] transition-all hover:bg-[#e8e0d4] disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send Check-In'}
              </button>
              <span className="block text-[13px] text-[#4a4a4a] mt-3.5 italic font-serif">
                Jess reads every single response. You&apos;ve got this.
              </span>
            </div>
          </>
        ) : (
          <div className="text-center py-20 fade-in">
            <span className="font-serif italic text-[60px] font-light text-[#f0ece4] block mb-6 opacity-30">✦</span>
            <h2 className="font-serif text-[32px] font-light text-[#f0ece4] mb-3.5">Check-in received.</h2>
            <p className="text-sm text-[#666] leading-[1.8] font-light max-w-[340px] mx-auto mb-2.5">
              Jess will review this and send your feedback and any plan updates within 24 hours. Keep showing up — it&apos;s working.
            </p>
            <span className="font-serif italic text-base text-[#4a4a4a] block mt-7">Less restriction. More you.</span>
          </div>
        )}

        <div className="text-center pt-10 text-[9px] tracking-[4px] uppercase text-[#4a4a4a] border-t border-[rgba(255,255,255,0.07)] mt-[60px] font-light">
          hercoach jess &nbsp;·&nbsp; less restriction. more you.
        </div>
      </div>
    </div>
  )
}

// ─── shared sub-components ───
function NoiseOverlay() {
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

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#0e0e0e] border border-[rgba(255,255,255,0.07)] rounded-2xl p-7 mb-3">{children}</div>
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] tracking-[4px] uppercase text-[#4a4a4a] font-normal mb-5 pb-3.5 border-b border-[rgba(255,255,255,0.07)] block">
      {children}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <label className="block text-[10px] tracking-[2px] uppercase text-[#666] mb-[9px]">{label}</label>
      {children}
    </div>
  )
}

function G2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7">{children}</div>
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} step="0.1"
      className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.07)] py-2.5 text-sm text-[#f0ece4] font-light outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors placeholder:text-[#4a4a4a]"
    />
  )
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.07)] py-2.5 text-sm text-[#f0ece4] font-light outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors placeholder:text-[#4a4a4a] resize-y min-h-[72px] leading-[1.7]"
    />
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.07)] py-2.5 text-sm text-[#f0ece4] font-light outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors appearance-none"
    >
      <option value="">Select</option>
      {options.map((o) => (
        <option key={o} value={o} style={{ background: '#141414', color: '#f0ece4' }}>{o}</option>
      ))}
    </select>
  )
}

function Pills({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-[7px]">{children}</div>
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-block px-4 py-2 border rounded-[2px] text-xs font-normal font-sans cursor-pointer transition-all ${
        active
          ? 'border-[rgba(255,255,255,0.3)] text-[#f0ece4] bg-[rgba(255,255,255,0.03)]'
          : 'border-[rgba(255,255,255,0.07)] text-[#666] hover:border-[rgba(255,255,255,0.15)] hover:text-[#d8d0c8]'
      }`}
    >
      {children}
    </button>
  )
}

function IconRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return <div className="grid gap-[7px]" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>{children}</div>
}

function IconPill({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-1.5 py-3.5 border rounded-md cursor-pointer transition-all ${
        active
          ? 'border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.02)]'
          : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)]'
      }`}
    >
      {icon}
      <span className={`text-[9px] text-center font-normal leading-[1.4] ${active ? 'text-[#e8e0d4]' : 'text-[#4a4a4a]'}`}>{label}</span>
    </button>
  )
}
