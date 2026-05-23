import Card, { CardHeader, CardBody } from '@/components/ui/Card'
import type { OnboardingSubmission } from '@/types'

interface Props {
  onboarding: OnboardingSubmission | null
}

export default function OnboardingFileTab({ onboarding }: Props) {
  if (!onboarding) {
    return (
      <div className="text-center py-20 text-[#b8b4ac] text-sm">
        No onboarding submission on record.
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = onboarding.payload ?? {}
  const b = p.basics ?? {}
  const g = p.goals ?? {}
  const l = p.lifestyle ?? {}
  const f = p.food_preferences ?? {}
  const h = p.health_screening ?? {}
  const a = p.acknowledgements ?? {}

  const list = (arr?: string[]) => (arr && arr.length ? arr.join(', ') : '—')

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Basics</span></CardHeader>
        <CardBody className="grid grid-cols-2 gap-3">
          <Row label="First name" value={b.first_name || '—'} />
          <Row label="Age" value={b.age || '—'} />
          <Row label="Email" value={b.email || '—'} />
          <Row label="Phone" value={b.phone || '—'} />
          <Row label="Current weight" value={b.current_weight_kg ? `${b.current_weight_kg} kg` : '—'} />
          <Row label="Height" value={b.height_cm ? `${b.height_cm} cm` : '—'} />
          <Row label="Goal weight" value={b.goal_weight_kg ? `${b.goal_weight_kg} kg` : '—'} />
          <Row label="City / Town" value={b.city || '—'} />
          <Row label="GP Surgery" value={b.gp_surgery || '—'} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Goals</span></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Row label="Primary goal" value={g.primary_goal || '—'} />
          <Row label="Timeline" value={g.timeline || '—'} />
          <Row label="Why it matters" value={g.why || '—'} multiline />
          <Row label="Previous experience" value={g.previous || '—'} multiline />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Lifestyle</span></CardHeader>
        <CardBody className="grid grid-cols-2 gap-3">
          <Row label="Activity level" value={l.activity || '—'} />
          <Row label="Training experience" value={l.experience || '—'} />
          <Row label="Days / week" value={l.training_days_per_week || '—'} />
          <Row label="Session length" value={l.session_length || '—'} />
          <Row label="Training location" value={l.training_location || '—'} />
          <Row label="Job / Routine" value={l.job || '—'} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Food & nutrition</span></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Row label="Diet type" value={f.diet_type || '—'} />
          <Row label="Meals per day" value={f.meals_per_day || '—'} />
          <Row label="Cooking confidence" value={f.cooking_confidence || '—'} />
          <Row label="Meal prep" value={f.meal_prep || '—'} />
          <Row label="Foods loved" value={f.foods_loved || '—'} multiline />
          <Row label="Foods disliked" value={f.foods_disliked || '—'} multiline />
          <Row label="Allergies / intolerances" value={f.allergies || '—'} />
          <Row label="Supplements" value={f.supplements || '—'} />
          <Row label="Current eating pattern" value={f.eating_pattern || '—'} multiline />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Health — physical</span></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Row label="Injuries / limitations" value={h.injuries || '—'} multiline />
          <Row label="Diagnosed conditions" value={list(h.conditions)} />
          <Row label="Medications" value={h.medications || '—'} multiline />
          <Row label="Pregnancy / TTC" value={h.pregnancy || '—'} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Health — mental & food relationship</span></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Row label="Mental health" value={h.mental_health || '—'} />
          <Row label="Food relationship" value={h.food_relationship || '—'} />
          <Row label="ED history" value={list(h.ed_history)} />
          <Row label="Mental health notes" value={h.mh_notes || '—'} multiline />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Wellbeing</span></CardHeader>
        <CardBody className="grid grid-cols-2 gap-3">
          <Row label="Sleep quality" value={h.sleep || '—'} />
          <Row label="Stress level" value={h.stress_level || '—'} />
          <Row label="Water intake" value={h.water_intake || '—'} />
          <Row label="Alcohol" value={h.alcohol || '—'} />
          <Row label="Other notes" value={h.other_health || '—'} multiline />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Declaration</span></CardHeader>
        <CardBody className="grid grid-cols-2 gap-3">
          <Row label="Scope of practice" value={a.scope ? 'Accepted' : '—'} />
          <Row label="Referral rights" value={a.referral ? 'Accepted' : '—'} />
          <Row label="Health declaration" value={a.health ? 'Accepted' : '—'} />
          <Row label="Liability" value={a.liability ? 'Accepted' : '—'} />
          <Row label="Payment terms" value={a.payment ? 'Accepted' : '—'} />
          <Row label="Cancellation" value={a.cancellation ? 'Accepted' : '—'} />
          <Row label="Data & privacy" value={a.data ? 'Accepted' : '—'} />
          <Row label="Age 18+ & agreement" value={a.age ? 'Accepted' : '—'} />
          <Row label="Signed name" value={onboarding.signed_name || '—'} />
          <Row label="Signed date" value={onboarding.signed_date || '—'} />
          <Row label="Submitted" value={new Date(onboarding.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
        </CardBody>
      </Card>
    </div>
  )
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={multiline ? 'flex flex-col gap-0.5' : 'flex items-start justify-between gap-4'}>
      <span className="text-xs text-[#b8b4ac] flex-shrink-0">{label}</span>
      <span className={`text-sm text-[#e0d8cc] ${multiline ? '' : 'text-right'} leading-relaxed`}>
        {value}
      </span>
    </div>
  )
}
