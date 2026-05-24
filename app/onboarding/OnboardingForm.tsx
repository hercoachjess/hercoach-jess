'use client'

import { useState } from 'react'

const TOTAL = 7

// ───────────────── SVG ICON HELPERS ─────────────────
type IconProps = { active: boolean }
const stroke = (active: boolean) => (active ? '#f0ece4' : '#444')

function GoalFatLoss({ active }: IconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="9" stroke={stroke(active)} strokeWidth="1.2" />
      <circle cx="13" cy="13" r="5" stroke={stroke(active)} strokeWidth="1.2" />
      <circle cx="13" cy="13" r="1.5" fill={stroke(active)} />
    </svg>
  )
}
function GoalMuscle({ active }: IconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M5 17l4-7 4 4 4-8 4 5" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h16" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function GoalRecomp({ active }: IconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="5" stroke={stroke(active)} strokeWidth="1.2" />
      <path d="M13 4v3M13 19v3M4 13h3M19 13h3M6.8 6.8l2.1 2.1M17.1 17.1l2.1 2.1M6.8 19.2l2.1-2.1M17.1 8.9l2.1-2.1" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function GoalMaintain({ active }: IconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M13 6l2 5h5l-4 3 1.5 5L13 17l-4.5 2L10 14 6 11h5z" stroke={stroke(active)} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
function GoalHealth({ active }: IconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M13 4C8.6 4 5 7.6 5 12s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z" stroke={stroke(active)} strokeWidth="1.2" />
      <path d="M9.5 12.5l3 3 5-5.5" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function GoalOther({ active }: IconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M13 5v8" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M13 13l5 4" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="13" cy="13" r="9" stroke={stroke(active)} strokeWidth="1.2" />
    </svg>
  )
}

function ActSedentary({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="16" height="9" rx="1" stroke={stroke(active)} strokeWidth="1.2" />
      <path d="M8 10V8a4 4 0 018 0v2" stroke={stroke(active)} strokeWidth="1.2" />
    </svg>
  )
}
function ActLight({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="2" stroke={stroke(active)} strokeWidth="1.2" />
      <path d="M9 9l-3 6h12l-3-6M12 9v5" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 20l3-4 3 4" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ActModerate({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="4" r="2" stroke={stroke(active)} strokeWidth="1.2" />
      <path d="M8 9l4 3 4-3M12 12v5" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 17l-2 4M15 17l2 4" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function ActVery({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 17l4-8 4 4 4-8 4 4" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExpBeginner({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V7M7 12l5-5 5 5" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ExpIntermediate({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V7M7 12l5-5 5 5M7 19h10" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ExpAdvanced({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 17l4-5 3 3 4-8 3 4" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LocGym({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={stroke(active)} strokeWidth="1.2" />
      <rect x="12" y="3" width="7" height="7" rx="1" stroke={stroke(active)} strokeWidth="1.2" />
      <rect x="3" y="12" width="7" height="7" rx="1" stroke={stroke(active)} strokeWidth="1.2" />
      <rect x="12" y="12" width="7" height="7" rx="1" stroke={stroke(active)} strokeWidth="1.2" />
    </svg>
  )
}
function LocHome({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 11l8-7 8 7v9H3z" stroke={stroke(active)} strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="8" y="14" width="6" height="6" stroke={stroke(active)} strokeWidth="1.2" />
    </svg>
  )
}
function LocHomeKit({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3" stroke={stroke(active)} strokeWidth="1.2" />
      <path d="M5 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function LocFull({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 11h3M16 11h3M6 11a5 5 0 0010 0M6 11a5 5 0 0110 0" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function LocMix({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 11h14M12 5l6 6-6 6" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const GOAL_OPTIONS = [
  { val: 'Fat Loss', Icon: GoalFatLoss },
  { val: 'Build Muscle', Icon: GoalMuscle },
  { val: 'Body Recomposition', Icon: GoalRecomp },
  { val: 'Maintain & Tone', Icon: GoalMaintain },
  { val: 'General Health', Icon: GoalHealth },
  { val: 'Other', Icon: GoalOther },
]
const ACTIVITY_OPTIONS = [
  { val: 'Sedentary', Icon: ActSedentary },
  { val: 'Lightly Active', Icon: ActLight },
  { val: 'Moderate', Icon: ActModerate },
  { val: 'Very Active', Icon: ActVery },
]
const EXP_OPTIONS = [
  { val: 'Beginner (0–1 yr)', Icon: ExpBeginner },
  { val: 'Intermediate (1–3 yrs)', Icon: ExpIntermediate },
  { val: 'Advanced (3+ yrs)', Icon: ExpAdvanced },
]
const LOC_OPTIONS = [
  { val: 'Gym', Icon: LocGym },
  { val: 'Home', Icon: LocHome },
  { val: 'Home w/ kit', Icon: LocHomeKit },
  { val: 'Full Setup', Icon: LocFull },
  { val: 'Mix', Icon: LocMix },
]

// ───────────────── COMPONENT ─────────────────
export default function OnboardingForm() {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [warn, setWarn] = useState(false)
  const [error, setError] = useState('')

  // Step 0 — basics
  const [basics, setBasics] = useState({
    first_name: '', age: '', current_weight_kg: '', height_cm: '',
    goal_weight_kg: '', city: '', email: '', phone: '', gp_surgery: '',
  })
  // Step 1 — goals
  const [goal, setGoal] = useState('')
  const [timeline, setTimeline] = useState('')
  const [why, setWhy] = useState('')
  const [previous, setPrevious] = useState('')
  // Step 2 — lifestyle
  const [activity, setActivity] = useState('')
  const [experience, setExperience] = useState('')
  const [trainDays, setTrainDays] = useState('')
  const [sessionLen, setSessionLen] = useState('')
  const [trainLoc, setTrainLoc] = useState('')
  const [job, setJob] = useState('')
  // Step 3 — food
  const [diet, setDiet] = useState('')
  const [mealsPerDay, setMealsPerDay] = useState('')
  const [cooking, setCooking] = useState('')
  const [prep, setPrep] = useState('')
  const [foodsLoved, setFoodsLoved] = useState('')
  const [foodsDisliked, setFoodsDisliked] = useState('')
  const [allergies, setAllergies] = useState('')
  const [supplements, setSupplements] = useState('')
  const [eatingPattern, setEatingPattern] = useState('')
  // Step 4 — health
  const [injuries, setInjuries] = useState('')
  const [conditions, setConditions] = useState<string[]>([])
  const [medications, setMedications] = useState('')
  const [pregnancy, setPregnancy] = useState('')
  const [mentalHealth, setMentalHealth] = useState('')
  const [foodRel, setFoodRel] = useState('')
  const [edHistory, setEdHistory] = useState<string[]>([])
  const [mhNotes, setMhNotes] = useState('')
  const [sleep, setSleep] = useState('')
  const [stressLevel, setStressLevel] = useState('')
  const [water, setWater] = useState('')
  const [alcohol, setAlcohol] = useState('')
  const [otherHealth, setOtherHealth] = useState('')
  // Step 5 — scope
  const [ackScope, setAckScope] = useState(false)
  const [ackReferral, setAckReferral] = useState(false)
  // Step 6 — declaration
  const [ackHealth, setAckHealth] = useState(false)
  const [ackLiability, setAckLiability] = useState(false)
  const [ackPayment, setAckPayment] = useState(false)
  const [ackCancellation, setAckCancellation] = useState(false)
  const [ackData, setAckData] = useState(false)
  const [ackAge, setAckAge] = useState(false)
  const [sigName, setSigName] = useState('')
  const [sigDate, setSigDate] = useState('')

  function go(to: number) {
    setStep(to)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleArr(arr: string[], v: string, set: (a: string[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }

  async function submitForm() {
    const allTicked = ackScope && ackReferral && ackHealth && ackLiability && ackPayment && ackCancellation && ackData && ackAge
    if (!allTicked || !sigName.trim() || !sigDate.trim()) {
      setWarn(true)
      return
    }
    setWarn(false)
    setSubmitting(true)
    setError('')

    const payload = {
      basics,
      goals: { primary_goal: goal, timeline, why, previous },
      lifestyle: { activity, experience, training_days_per_week: trainDays, session_length: sessionLen, training_location: trainLoc, job },
      food_preferences: {
        diet_type: diet, meals_per_day: mealsPerDay, cooking_confidence: cooking,
        meal_prep: prep, foods_loved: foodsLoved, foods_disliked: foodsDisliked,
        allergies, supplements, eating_pattern: eatingPattern,
      },
      health_screening: {
        injuries, conditions, medications, pregnancy,
        mental_health: mentalHealth, food_relationship: foodRel,
        ed_history: edHistory, mh_notes: mhNotes,
        sleep, stress_level: stressLevel, water_intake: water, alcohol, other_health: otherHealth,
      },
      acknowledgements: {
        scope: ackScope, referral: ackReferral, health: ackHealth,
        liability: ackLiability, payment: ackPayment, cancellation: ackCancellation,
        data: ackData, age: ackAge,
      },
    }

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, signed_name: sigName.trim(), signed_date: sigDate.trim() }),
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

  if (submitted) {
    return (
      <div className="bg-[#080808] min-h-screen relative">
        <NoiseOverlay />
        <div className="relative z-10 max-w-[640px] mx-auto px-7 pb-24">
          <div className="text-center py-20 fade-in">
            <span className="font-serif italic text-[60px] font-light text-[#f0ece4] block mb-6 opacity-30">✦</span>
            <h2 className="font-serif text-[34px] font-light text-[#f0ece4] mb-3.5">You&apos;re all set.</h2>
            <p className="text-sm text-[#a8a49c] leading-[1.8] font-light max-w-[400px] mx-auto mb-2.5">
              Your form and signed declaration have been received. Jess will review your health screening carefully and be in touch as soon as she can with your payment details and next steps.
            </p>
            <p className="text-xs text-[#7a7670] mt-2 italic font-serif">
              You&apos;ve taken the first step — that matters.
            </p>
            <span className="font-serif italic text-[17px] text-[#7a7670] block mt-7">Less restriction. More you.</span>
          </div>
          <Footer />
        </div>
      </div>
    )
  }

  const tip = (n: number) => (step >= n ? (step === n ? 'active' : 'done') : '')

  return (
    <div className="bg-[#080808] min-h-screen relative" style={{ fontFamily: 'var(--font-jost), sans-serif', color: '#e0d8cc' }}>
      <NoiseOverlay />

      <div className="relative z-10 max-w-[640px] mx-auto px-7 pb-24">
        {/* ─── HERO ─── */}
        <div className="pt-20 pb-[60px] text-center border-b border-[rgba(255,255,255,0.24)] mb-[52px]">
          <span className="text-[9px] tracking-[7px] uppercase text-[#7a7670] font-light block mb-2">Welcome to</span>
          <span className="font-serif italic text-[44px] font-light text-[#f0ece4] tracking-[-1px] block leading-none">hercoach Jess</span>
          <div className="w-full h-px my-[10px] mb-[9px]" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />
          <span className="text-[9px] tracking-[5px] uppercase text-[#7a7670] font-light block mb-8">Less restriction. More you.</span>

          <div className="inline-flex flex-col items-center gap-1.5 border border-[rgba(255,255,255,0.24)] rounded px-6 py-3.5 mb-9">
            <span className="text-[10px] tracking-[3px] uppercase text-[#7a7670]">Your Coach</span>
            <span className="font-serif italic text-[18px] text-[#f0ece4] font-light">Jess — Registered Dietitian</span>
            <span className="text-[9px] tracking-[2px] uppercase text-[#7a7670] font-light">
              HCPC Registered &nbsp;·&nbsp; BSc Dietetics &nbsp;·&nbsp; England &amp; Wales
            </span>
          </div>

          <h1 className="font-serif font-light text-[clamp(28px,5vw,40px)] text-[#f0ece4] tracking-[-0.5px] mb-4 leading-[1.2]">
            Let&apos;s build something<br /><em className="italic">made for you.</em>
          </h1>
          <p className="text-[13px] text-[#a8a49c] leading-[1.9] font-light max-w-[440px] mx-auto">
            This form takes around 5–8 minutes and gives Jess everything she needs to build a plan that is nutritionally sound, evidence-based, and genuinely tailored to your real life. Everything you share is completely confidential.
          </p>

          <div className="grid grid-cols-3 gap-px border border-[rgba(255,255,255,0.24)] rounded mt-7 overflow-hidden bg-[rgba(255,255,255,0.24)]">
            <CredItem label="Qualification" value="Registered Dietitian" />
            <CredItem label="Registered with" value="HCPC & BDA" />
            <CredItem label="Nutrition advice" value="Clinically credible" />
          </div>
        </div>

        {/* ─── PROGRESS DOTS ─── */}
        <div className="flex gap-[5px] justify-center mb-[52px]">
          {[...Array(TOTAL)].map((_, i) => (
            <div
              key={i}
              className={`h-[2px] rounded-[2px] transition-all duration-400 ${
                tip(i) === 'active' ? 'w-9 bg-[#f0ece4]' : tip(i) === 'done' ? 'w-5 bg-[#2e2e2e]' : 'w-5 bg-[#1c1c1c]'
              }`}
            />
          ))}
        </div>

        {/* ─── STEP 0: BASICS ─── */}
        {step === 0 && (
          <StepWrap eyebrow="01 — About you" title="The basics" sub="No judgement. Ever.">
            <Card>
              <G2>
                <Field label="First Name"><Input value={basics.first_name} onChange={(v) => setBasics({ ...basics, first_name: v })} placeholder="e.g. Sarah" /></Field>
                <Field label="Age"><Input type="number" value={basics.age} onChange={(v) => setBasics({ ...basics, age: v })} placeholder="e.g. 28" /></Field>
                <Field label="Current Weight (kg)"><Input type="number" value={basics.current_weight_kg} onChange={(v) => setBasics({ ...basics, current_weight_kg: v })} placeholder="e.g. 72" /></Field>
                <Field label="Height (cm)"><Input type="number" value={basics.height_cm} onChange={(v) => setBasics({ ...basics, height_cm: v })} placeholder="e.g. 165" /></Field>
                <Field label="Goal Weight (kg)"><Input type="number" value={basics.goal_weight_kg} onChange={(v) => setBasics({ ...basics, goal_weight_kg: v })} placeholder="e.g. 65" /></Field>
                <Field label="City / Town"><Input value={basics.city} onChange={(v) => setBasics({ ...basics, city: v })} placeholder="e.g. Manchester" /></Field>
              </G2>
              <Field label="Email Address"><Input type="email" value={basics.email} onChange={(v) => setBasics({ ...basics, email: v })} placeholder="e.g. sarah@email.com" /></Field>
              <Field label="Phone Number"><Input type="tel" value={basics.phone} onChange={(v) => setBasics({ ...basics, phone: v })} placeholder="e.g. 07700 900000" /></Field>
              <Field label="GP Surgery Name & Town"><Input value={basics.gp_surgery} onChange={(v) => setBasics({ ...basics, gp_surgery: v })} placeholder="e.g. Oakfield Surgery, Leeds" /></Field>
            </Card>
            <Nav onNext={() => go(1)} />
          </StepWrap>
        )}

        {/* ─── STEP 1: GOALS ─── */}
        {step === 1 && (
          <StepWrap eyebrow="02 — Goals" title="What are we working towards?" sub="Be as specific as you can — this shapes your entire plan.">
            <Card>
              <Field label="Primary Goal">
                <IconRow cols={3}>
                  {GOAL_OPTIONS.map(({ val, Icon }) => (
                    <IconPill key={val} active={goal === val} onClick={() => setGoal(val)} label={val} icon={<Icon active={goal === val} />} />
                  ))}
                </IconRow>
              </Field>
              <Field label="Timeline">
                <Pills>
                  {['4 weeks', '8 weeks', '12 weeks', '6 months', 'Ongoing'].map((v) => (
                    <Pill key={v} active={timeline === v} onClick={() => setTimeline(v)}>{v}</Pill>
                  ))}
                </Pills>
              </Field>
              <Field label="Why does this goal matter to you?">
                <Textarea value={why} onChange={setWhy} placeholder="What's the real reason? A feeling, an event, something personal — tell me everything." />
              </Field>
              <Field label="Have you tried coaching or dieting before?">
                <Textarea value={previous} onChange={setPrevious} placeholder="What worked? What didn't? What made you stop? No shame here at all." />
              </Field>
            </Card>
            <Nav onBack={() => go(0)} onNext={() => go(2)} />
          </StepWrap>
        )}

        {/* ─── STEP 2: LIFESTYLE ─── */}
        {step === 2 && (
          <StepWrap eyebrow="03 — Lifestyle" title="Your life, your schedule" sub="The plan fits around you — not the other way round.">
            <Card>
              <Field label="Current Activity Level">
                <IconRow cols={4}>
                  {ACTIVITY_OPTIONS.map(({ val, Icon }) => (
                    <IconPill key={val} active={activity === val} onClick={() => setActivity(val)} label={val} icon={<Icon active={activity === val} />} />
                  ))}
                </IconRow>
              </Field>
              <Field label="Training Experience">
                <IconRow cols={3}>
                  {EXP_OPTIONS.map(({ val, Icon }) => (
                    <IconPill key={val} active={experience === val} onClick={() => setExperience(val)} label={val} icon={<Icon active={experience === val} />} />
                  ))}
                </IconRow>
              </Field>
              <G2>
                <Field label="Training Days / Week">
                  <Select value={trainDays} onChange={setTrainDays} options={['2 days','3 days','4 days','5 days','6 days']} />
                </Field>
                <Field label="Session Length">
                  <Select value={sessionLen} onChange={setSessionLen} options={['30 mins','45 mins','60 mins','75+ mins']} />
                </Field>
              </G2>
              <Field label="Where do you train?">
                <IconRow cols={5}>
                  {LOC_OPTIONS.map(({ val, Icon }) => (
                    <IconPill key={val} active={trainLoc === val} onClick={() => setTrainLoc(val)} label={val} icon={<Icon active={trainLoc === val} />} />
                  ))}
                </IconRow>
              </Field>
              <Field label="Job / Daily Routine">
                <Select value={job} onChange={setJob} options={['Office / desk job','On my feet all day','Mixed','Work from home','Shift work','Stay at home / carer']} />
              </Field>
            </Card>
            <Nav onBack={() => go(1)} onNext={() => go(3)} />
          </StepWrap>
        )}

        {/* ─── STEP 3: FOOD ─── */}
        {step === 3 && (
          <StepWrap eyebrow="04 — Food & Nutrition" title="Let's talk about food" sub="The more honest you are here, the better your plan. No food is banned forever.">
            <Card>
              <Field label="Diet Type">
                <Pills>{['No restrictions','Vegetarian','Vegan','Pescatarian','Gluten-Free','Dairy-Free'].map(v => <Pill key={v} active={diet === v} onClick={() => setDiet(v)}>{v}</Pill>)}</Pills>
              </Field>
              <Field label="Meals per day (roughly)">
                <Pills>{['2 meals','3 meals','3 + snacks','4–5 meals'].map(v => <Pill key={v} active={mealsPerDay === v} onClick={() => setMealsPerDay(v)}>{v}</Pill>)}</Pills>
              </Field>
              <Field label="Cooking confidence">
                <Pills>{['Microwave only','Basic','Intermediate','Love cooking'].map(v => <Pill key={v} active={cooking === v} onClick={() => setCooking(v)}>{v}</Pill>)}</Pills>
              </Field>
              <Field label="Meal prep preference">
                <Pills>{['Yes — love it','Some things','Not really'].map(v => <Pill key={v} active={prep === v} onClick={() => setPrep(v)}>{v}</Pill>)}</Pills>
              </Field>
              <Field label="Foods you love"><Textarea value={foodsLoved} onChange={setFoodsLoved} placeholder="Be as specific as possible — e.g. pasta, Greek yoghurt, stir fry, chocolate, rice dishes..." /></Field>
              <Field label="Foods you dislike or won't eat"><Textarea value={foodsDisliked} onChange={setFoodsDisliked} placeholder="e.g. mushrooms, fish, cottage cheese, anything with a strong smell — the more detail the better." /></Field>
              <Field label="Allergies or intolerances"><Input value={allergies} onChange={setAllergies} placeholder="e.g. nut allergy, lactose intolerant, celiac disease..." /></Field>
              <Field label="Do you take any supplements currently?"><Input value={supplements} onChange={setSupplements} placeholder="e.g. vitamin D, protein powder, iron tablets, creatine..." /></Field>
              <Field label="How would you describe your current eating pattern?">
                <Textarea value={eatingPattern} onChange={setEatingPattern} placeholder="e.g. I skip breakfast, I eat a big lunch, I snack a lot in the evenings, I eat well Mon–Fri then lose it at weekends..." />
              </Field>
            </Card>
            <Nav onBack={() => go(2)} onNext={() => go(4)} />
          </StepWrap>
        )}

        {/* ─── STEP 4: HEALTH ─── */}
        {step === 4 && (
          <StepWrap eyebrow="05 — Health Screening" title="Your health history" sub="As a Registered Dietitian, Jess takes this section seriously. Please answer as fully and honestly as you can. Everything is completely confidential and protected.">
            <Card>
              <CardSection>Physical Health</CardSection>
              <Field label="Do you have any current or recent injuries or physical limitations?">
                <Textarea value={injuries} onChange={setInjuries} placeholder="e.g. bad knee, lower back issues, shoulder injury, chronic pain, post-surgical recovery... or write 'none'" />
              </Field>
              <Field label="Have you been diagnosed with any of the following? (select all that apply)">
                <Pills>
                  {['Type 1 Diabetes','Type 2 Diabetes','PCOS','Thyroid condition','IBS / IBD','Coeliac disease','Cardiovascular condition','Kidney / liver condition','Osteoporosis / bone condition','Endometriosis','None of the above'].map(v => (
                    <Pill key={v} active={conditions.includes(v)} onClick={() => toggleArr(conditions, v, setConditions)}>{v}</Pill>
                  ))}
                </Pills>
                <FlagNote>If you have selected any condition above, Jess will review your screening carefully and may be in touch to discuss whether this programme is appropriate for you, or whether a referral to specialist dietetic support is more suitable. This is not a barrier to working together — it is simply good professional practice.</FlagNote>
              </Field>
              <Field label="Are you currently taking any prescribed medications?">
                <Textarea value={medications} onChange={setMedications} placeholder="e.g. metformin, levothyroxine, antidepressants, blood pressure medication, contraceptive pill... Please list any that may interact with nutrition or exercise." />
              </Field>
              <Field label="Are you currently pregnant, breastfeeding, or trying to conceive?">
                <Pills>{['No','Pregnant','Breastfeeding','Trying to conceive'].map(v => <Pill key={v} active={pregnancy === v} onClick={() => setPregnancy(v)}>{v}</Pill>)}</Pills>
                <FlagNote>If you are pregnant or breastfeeding, Jess will ensure any nutrition guidance reflects current NICE guidelines for this stage. Please note that high-intensity exercise programming will be adapted accordingly.</FlagNote>
              </Field>
            </Card>

            <Card>
              <CardSection>Mental Health &amp; Relationship with Food</CardSection>
              <Field label="How would you describe your current mental health?">
                <Pills>{['Good — generally well','Up and down','Managing anxiety / depression','Prefer not to say'].map(v => <Pill key={v} active={mentalHealth === v} onClick={() => setMentalHealth(v)}>{v}</Pill>)}</Pills>
              </Field>
              <Field label="How would you describe your relationship with food?">
                <Pills>{['Really positive','Mostly fine','Up and down','Complicated','Difficult'].map(v => <Pill key={v} active={foodRel === v} onClick={() => setFoodRel(v)}>{v}</Pill>)}</Pills>
              </Field>
              <Field label="Have you ever experienced, or do you currently experience, any of the following? (select all that apply)">
                <Pills>
                  {['Restrictive eating / undereating','Binge eating','Purging behaviours','Orthorexia / obsessive food rules','Compulsive exercise','None of the above'].map(v => (
                    <Pill key={v} active={edHistory.includes(v)} onClick={() => toggleArr(edHistory, v, setEdHistory)}>{v}</Pill>
                  ))}
                </Pills>
                <FlagNote>As a Registered Dietitian, Jess takes eating behaviours seriously and will approach this sensitively. If any of the above apply, this is not a barrier to working together — but your programme will be carefully considered to ensure it supports your wellbeing rather than creating pressure. In some cases, Jess may recommend that specialist eating disorder support runs alongside this programme.</FlagNote>
              </Field>
              <Field label="Is there anything else about your mental health or relationship with food that you would like Jess to be aware of?">
                <Textarea value={mhNotes} onChange={setMhNotes} placeholder="Completely optional. Share as much or as little as you feel comfortable with." />
              </Field>
            </Card>

            <Card>
              <CardSection>General Wellbeing</CardSection>
              <G2>
                <Field label="Sleep quality (generally)">
                  <Select value={sleep} onChange={setSleep} options={['Great — 7–9hrs solid','Good — mostly fine','Average — broken','Poor — under 6hrs regularly','Very poor']} />
                </Field>
                <Field label="Stress levels day-to-day">
                  <Select value={stressLevel} onChange={setStressLevel} options={['Low — fairly calm','Moderate — manageable','High — quite stressed','Very high — struggling']} />
                </Field>
              </G2>
              <Field label="Daily water intake">
                <Pills>{['Under 1L','1–1.5L','1.5–2L','2L+'].map(v => <Pill key={v} active={water === v} onClick={() => setWater(v)}>{v}</Pill>)}</Pills>
              </Field>
              <Field label="Alcohol intake">
                <Pills>{['Never','Rarely','Weekends only','Few times/week','Most days'].map(v => <Pill key={v} active={alcohol === v} onClick={() => setAlcohol(v)}>{v}</Pill>)}</Pills>
              </Field>
              <Field label="Is there anything else about your health that you want Jess to know before you begin?">
                <Textarea value={otherHealth} onChange={setOtherHealth} placeholder="Work schedule, family commitments, upcoming events, things that have held you back before..." />
              </Field>
            </Card>
            <Nav onBack={() => go(3)} onNext={() => go(5)} />
          </StepWrap>
        )}

        {/* ─── STEP 5: SCOPE ─── */}
        {step === 5 && (
          <StepWrap eyebrow="06 — Scope of Practice" title="What this programme covers" sub="Please read this carefully before signing. It outlines exactly what Jess offers, what falls outside this programme, and how you will be supported if your needs change.">
            <LegalBlock title="What HerCoach Jess provides" jurisdiction="Professional Scope of Practice — Registered Dietitian (HCPC)">
              <p>Jess is a Registered Dietitian (RD) registered with the Health and Care Professions Council (HCPC). As such, she is a legally protected, Allied Health Professional qualified to provide <strong>personalised, evidence-based nutrition advice</strong> — including medical nutrition therapy, macronutrient prescription, and dietary assessment.</p>
              <p>This programme includes:</p>
              <ul>
                <li>Personalised nutrition plans with specific gram-based targets, tailored to your goals, health status, and food preferences</li>
                <li>Weekly nutrition check-ins, plan updates, and professional feedback</li>
                <li>General wellness exercise guidance — structured fitness programmes designed to support your health and physique goals</li>
                <li>Ongoing coaching support, accountability, and education around sustainable nutrition habits</li>
              </ul>
              <p><strong>Important — fitness plans:</strong> The exercise programmes provided within this coaching service are general wellness and fitness guidance. They are not clinical exercise prescriptions, physiotherapy, or specialist rehabilitation programmes. They are designed for generally healthy adults seeking to improve their fitness and body composition.</p>
            </LegalBlock>
            <CheckRow ticked={ackScope} onToggle={() => setAckScope(!ackScope)}>
              I understand what this programme includes and that the fitness guidance provided is <strong>general wellness guidance</strong>, not clinical exercise prescription.
            </CheckRow>

            <LegalBlock title="Referral & Right to Decline or Redirect" jurisdiction="Professional Duty of Care — HCPC Standards of Conduct">
              <p>As a Registered Dietitian bound by the HCPC Standards of Conduct, Performance and Ethics, Jess has a professional duty to act in your best interest at all times. This means:</p>
              <ul>
                <li><strong>Right to refer:</strong> Jess reserves the right to refer you to your GP, a specialist dietitian, a physiotherapist, or another qualified health professional at any point during your programme if she believes your needs fall outside the scope of this coaching service.</li>
                <li><strong>Right to decline:</strong> Jess reserves the right to decline to commence, or to pause, a coaching programme if she reasonably believes that doing so would not be in your best interest, or if the health information provided indicates that a more specialist level of support is required first.</li>
                <li><strong>Parallel support:</strong> In some cases — particularly where eating behaviours, mental health, or complex medical conditions are indicated — Jess may recommend that specialist support runs alongside this programme. This is not a rejection; it is professional best practice.</li>
                <li><strong>Complex clinical cases:</strong> Where a client presents with complex clinical needs, Jess will provide general nutrition and wellness support within safe parameters and will signpost to appropriate clinical services. She will not provide specialist clinical dietetic intervention (e.g. refeeding, enteral nutrition, complex renal or oncology dietetics) within this coaching model.</li>
              </ul>
              <p>If a referral or programme pause is recommended, Jess will discuss this with you directly and sensitively. Your wellbeing always comes first.</p>
            </LegalBlock>
            <CheckRow ticked={ackReferral} onToggle={() => setAckReferral(!ackReferral)}>
              I understand that Jess has the professional right to refer me to another service, pause my programme, or decline to proceed if she believes it is in my best interest to do so.
            </CheckRow>

            <Nav onBack={() => go(4)} onNext={() => go(6)} nextLabel="Continue to Declaration" />
          </StepWrap>
        )}

        {/* ─── STEP 6: DECLARATION ─── */}
        {step === 6 && (
          <StepWrap eyebrow="07 — Declaration & Agreement" title="Before we begin" sub="Please read and confirm each section. This is a legally binding agreement under the laws of England and Wales.">
            <LegalBlock title="Health Declaration" jurisdiction="England & Wales">
              <p>I confirm that the health information I have provided in this form is accurate and complete to the best of my knowledge. I understand that the nutrition and wellness guidance provided by HerCoach Jess is based entirely on the information I have disclosed, and that any omission or inaccuracy may affect the safety and suitability of my programme.</p>
              <p>I agree to inform Jess immediately if my health status changes — including new diagnoses, new medications, injury, pregnancy, or any significant change in mental health — so that my programme can be reviewed and adjusted accordingly.</p>
              <p>I confirm I have been advised to consult my GP before commencing this programme if I have any concerns about my physical or mental health.</p>
            </LegalBlock>
            <CheckRow ticked={ackHealth} onToggle={() => setAckHealth(!ackHealth)}>
              I confirm that all health information provided is accurate and I will notify Jess of any changes to my health status during the programme.
            </CheckRow>

            <LegalBlock title="Liability" jurisdiction="England & Wales">
              <p>I agree that HerCoach Jess shall not be held liable for any injury, illness, adverse reaction, or loss arising from participation in this programme, provided that guidance was given in good faith based on the information I supplied. If I have withheld or misrepresented any health information, I accept full responsibility for any consequences arising from that omission.</p>
              <p>Nothing in this clause excludes liability for death or personal injury caused by negligence, or any liability that cannot lawfully be excluded under the Consumer Rights Act 2015 or any other applicable law of England and Wales.</p>
            </LegalBlock>
            <CheckRow ticked={ackLiability} onToggle={() => setAckLiability(!ackLiability)}>
              I have read and understood the liability clause and agree to its terms.
            </CheckRow>

            <LegalBlock title="Payment Terms" jurisdiction="England & Wales">
              <p><strong>Full payment upfront:</strong> The agreed programme fee must be paid in full before any plan, coaching material, or consultation is delivered. No plan will be sent until cleared payment has been received.</p>
              <p><strong>Non-payment:</strong> If payment is not received within 48 hours of the agreed start date, HerCoach Jess reserves the right to release your coaching slot without notice.</p>
              <p><strong>Ongoing coaching:</strong> Where a rolling coaching arrangement is agreed, payment is due in advance on the agreed date. Coaching services — including check-in responses, plan updates, and communication — will be paused if payment is not received on time, and will resume upon receipt of cleared payment.</p>
            </LegalBlock>
            <CheckRow ticked={ackPayment} onToggle={() => setAckPayment(!ackPayment)}>
              I understand that <strong>full payment is required before my plan is delivered</strong> and agree to the payment terms above.
            </CheckRow>

            <LegalBlock title="Cancellation & Refund Policy" jurisdiction="Consumer Contracts Regulations 2013 — England & Wales">
              <p><strong>No refunds once delivered:</strong> Due to the bespoke, personalised nature of this service — including individually tailored nutrition plans, fitness programmes, and coaching materials — <strong>no refund will be issued once your plan has been delivered</strong>.</p>
              <p><strong>Waiver of cancellation right:</strong> By submitting this form and making payment, you expressly consent to the immediate performance of this digital service upon delivery. Your 14-day cancellation right under Regulation 37 of the Consumer Contracts Regulations 2013 is thereby waived at the point your plan is sent.</p>
              <p><strong>Before delivery:</strong> Cancellations requested before your plan has been delivered are entitled to a full refund. Please contact Jess directly as soon as possible.</p>
              <p><strong>Exceptional circumstances:</strong> HerCoach Jess reserves the right to consider refund requests in exceptional circumstances at her sole discretion. Your statutory rights are not affected.</p>
            </LegalBlock>
            <CheckRow ticked={ackCancellation} onToggle={() => setAckCancellation(!ackCancellation)}>
              I understand that <strong>no refund will be issued once my plan is delivered</strong>, and I waive my 14-day cancellation right upon delivery of my personalised digital plan.
            </CheckRow>

            <LegalBlock title="Data & Privacy" jurisdiction="UK GDPR & Data Protection Act 2018 — England & Wales">
              <p>The personal and health information provided in this form will be held securely by HerCoach Jess and used solely for the delivery of your coaching programme. Your data will never be shared with third parties without your explicit consent.</p>
              <p>As health data is classified as special category data under UK GDPR, it is processed on the lawful basis of explicit consent (Article 9(2)(a)) and is subject to the highest standard of care. Your records will be retained for a minimum of <strong>7 years</strong> following the end of your programme, in line with health record retention standards applicable in England and Wales, after which they will be securely deleted.</p>
              <p>You have the right to access, amend, or request deletion of your data at any time by contacting Jess directly.</p>
            </LegalBlock>
            <CheckRow ticked={ackData} onToggle={() => setAckData(!ackData)}>
              I consent to HerCoach Jess storing and processing my personal and health data for the purpose of delivering my coaching programme in accordance with UK GDPR and the Data Protection Act 2018.
            </CheckRow>

            <LegalBlock title="Age, Accuracy & Coaching Agreement" jurisdiction="England & Wales">
              <p>I confirm that I am 18 years of age or older. I confirm that all information provided in this form is truthful and accurate. I understand that HerCoach Jess has based her professional assessment and programme design entirely on what I have disclosed.</p>
              <p>I agree to engage with this programme in good faith — submitting weekly check-ins, following the plan to the best of my ability, and communicating openly with my coach. I understand that results depend on my own consistent effort, and that no specific outcome can be guaranteed.</p>
              <p>This declaration, together with the verbal or written agreement of programme fee, constitutes the full agreement between myself and HerCoach Jess and is governed by the laws of England and Wales.</p>
            </LegalBlock>
            <CheckRow ticked={ackAge} onToggle={() => setAckAge(!ackAge)}>
              I confirm I am 18 or over, that all information provided is accurate, and I agree to the full terms of this coaching agreement.
            </CheckRow>

            <Card>
              <div className="mt-4">
                <label className="block text-[10px] tracking-[2px] uppercase text-[#7a7670] mb-2">Full Name — typed signature</label>
                <input
                  type="text" value={sigName} onChange={(e) => setSigName(e.target.value)}
                  placeholder="Type your full name to sign"
                  className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.24)] py-2.5 font-serif italic text-[22px] text-[#f0ece4] outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors"
                />
              </div>
              <div className="mt-5">
                <label className="block text-[10px] tracking-[2px] uppercase text-[#7a7670] mb-2">Date</label>
                <input
                  type="text" value={sigDate} onChange={(e) => setSigDate(e.target.value)}
                  placeholder="e.g. 18 May 2026"
                  className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.24)] py-2.5 font-serif italic text-[22px] text-[#f0ece4] outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors"
                />
              </div>
              <div className="mt-4 pt-3.5 border-t border-[rgba(255,255,255,0.24)]">
                <p className="text-[11px] text-[#7a7670] font-light leading-[1.7] italic font-serif">
                  By typing your name above, you confirm that you have read, understood, and agree to all declarations on this page. This constitutes a valid electronic signature under the Electronic Communications Act 2000 (England and Wales).
                </p>
              </div>
            </Card>

            {(warn || error) && (
              <div className="mt-3 px-4 py-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded">
                <p className="text-[11px] text-[#a8a49c] font-light">
                  {error || 'Please tick all declarations and enter your full name and date before submitting.'}
                </p>
              </div>
            )}

            <Nav onBack={() => go(5)} onSubmit={submitForm} submitLabel={submitting ? 'Submitting…' : 'Sign & Submit'} submitting={submitting} />
          </StepWrap>
        )}

        <Footer />
      </div>
    </div>
  )
}

// ───────────────── SHARED SUB-COMPONENTS ─────────────────
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

function CredItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0e0e0e] py-3.5 px-2.5 text-center">
      <span className="text-[8px] tracking-[2.5px] uppercase text-[#7a7670] block mb-1">{label}</span>
      <span className="font-serif italic text-[13px] text-[#e0d8cc] font-light">{value}</span>
    </div>
  )
}

function StepWrap({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="fade-in">
      <span className="text-[9px] tracking-[4px] uppercase text-[#7a7670] mb-2.5 block">{eyebrow}</span>
      <h2 className="font-serif text-[30px] font-light text-[#f0ece4] mb-1.5 tracking-[-0.3px]">{title}</h2>
      <p className="text-[13px] text-[#a8a49c] leading-[1.7] font-light mb-8">{sub}</p>
      {children}
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

function CardSection({ children }: { children: React.ReactNode }) {
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

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
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
      className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.24)] py-2.5 text-sm text-[#f0ece4] font-light outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors placeholder:text-[#7a7670] resize-y min-h-[80px] leading-[1.7]"
    />
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.24)] py-2.5 text-sm text-[#f0ece4] font-light outline-none focus:border-b-[rgba(255,255,255,0.3)] transition-colors appearance-none"
    >
      <option value="">Select</option>
      {options.map((o) => (
        <option key={o} value={o} style={{ background: '#141414', color: '#f0ece4' }}>
          {o}
        </option>
      ))}
    </select>
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
      className={`inline-block px-[18px] py-2 border rounded-[2px] text-xs font-normal font-sans cursor-pointer transition-all ${
        active
          ? 'border-[rgba(255,255,255,0.3)] text-[#f0ece4] bg-[rgba(255,255,255,0.03)]'
          : 'border-[rgba(255,255,255,0.24)] text-[#a8a49c] hover:border-[rgba(255,255,255,0.26)] hover:text-[#e0d8cc]'
      }`}
    >
      {children}
    </button>
  )
}

function IconRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>{children}</div>
}

function IconPill({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 px-2 py-4 border rounded-md cursor-pointer transition-all ${
        active
          ? 'border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.02)]'
          : 'border-[rgba(255,255,255,0.24)] hover:border-[rgba(255,255,255,0.26)]'
      }`}
    >
      {icon}
      <span className={`text-[11px] text-center font-normal leading-[1.4] ${active ? 'text-[#e8e0d4]' : 'text-[#a8a49c]'}`}>{label}</span>
    </button>
  )
}

function FlagNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 px-3.5 py-2.5 bg-[rgba(255,255,255,0.02)] rounded-r" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="text-[11px] text-[#7a7670] leading-[1.6] font-light italic font-serif">{children}</p>
    </div>
  )
}

function LegalBlock({ title, jurisdiction, children }: { title: string; jurisdiction: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] border border-[rgba(255,255,255,0.24)] rounded-xl p-6 mb-3">
      <div className="font-serif text-[18px] font-light text-[#f0ece4] mb-1 tracking-[-0.2px]">{title}</div>
      <span className="text-[9px] tracking-[2.5px] uppercase text-[#7a7670] block mb-4">{jurisdiction}</span>
      <div className="text-xs text-[#a8a49c] leading-[1.95] font-light max-h-[170px] overflow-y-auto pr-2 mb-4 legal-body">
        {children}
      </div>
      <style jsx>{`
        .legal-body :global(p) { margin-bottom: 10px; }
        .legal-body :global(ul) { padding-left: 16px; margin-bottom: 10px; }
        .legal-body :global(li) { margin-bottom: 6px; }
        .legal-body :global(strong) { color: #e0d8cc; font-weight: 400; }
        .legal-body::-webkit-scrollbar { width: 2px; }
        .legal-body::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 2px; }
      `}</style>
    </div>
  )
}

function CheckRow({ ticked, onToggle, children }: { ticked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <label
      className="flex items-start gap-3.5 py-3.5 px-6 mb-3 -mt-3 bg-[#141414] border-l border-r border-b border-[rgba(255,255,255,0.24)] rounded-b-xl cursor-pointer"
      onClick={(e) => { e.preventDefault(); onToggle() }}
    >
      <div
        className={`w-[18px] h-[18px] border rounded-[2px] flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
          ticked ? 'border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.24)]'
        }`}
      >
        {ticked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="#f0ece4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-xs text-[#a8a49c] leading-[1.7] font-light flex-1 [&_strong]:text-[#e0d8cc] [&_strong]:font-normal">
        {children}
      </span>
    </label>
  )
}

function Nav({
  onBack, onNext, onSubmit, nextLabel = 'Continue', submitLabel, submitting,
}: {
  onBack?: () => void; onNext?: () => void; onSubmit?: () => void;
  nextLabel?: string; submitLabel?: string; submitting?: boolean
}) {
  return (
    <div className="flex justify-between items-center mt-8">
      {onBack ? (
        <button onClick={onBack} className="bg-transparent border-0 text-[#7a7670] text-[10px] tracking-[2.5px] uppercase cursor-pointer font-sans transition-colors hover:text-[#e0d8cc] p-0">← Back</button>
      ) : <span />}
      {onSubmit ? (
        <button onClick={onSubmit} disabled={submitting} className="bg-[#f0ece4] border-0 text-[#080808] px-[38px] py-3 text-[10px] font-medium tracking-[3px] uppercase cursor-pointer font-sans rounded-[2px] transition-all hover:bg-[#e8e0d4] disabled:opacity-50">
          {submitLabel}
        </button>
      ) : (
        <button onClick={onNext} className="bg-[#f0ece4] border-0 text-[#080808] px-[38px] py-3 text-[10px] font-medium tracking-[3px] uppercase cursor-pointer font-sans rounded-[2px] transition-all hover:bg-[#e8e0d4]">
          {nextLabel}
        </button>
      )}
    </div>
  )
}

function Footer() {
  return (
    <div className="text-center pt-10 text-[9px] tracking-[4px] uppercase text-[#7a7670] border-t border-[rgba(255,255,255,0.24)] mt-[60px] font-light">
      hercoach jess &nbsp;·&nbsp; registered dietitian &nbsp;·&nbsp; hcpc registered &nbsp;·&nbsp; england &amp; wales
    </div>
  )
}
